import React, { useEffect, useMemo, useState } from "react";
import { getProducts } from "../utils/api";
import { formatStock } from "../utils/looseStock";

/*
|--------------------------------------------------------------------------
| Salt helpers
|--------------------------------------------------------------------------
| "PARACETAMOL 650MG"          -> name PARACETAMOL, strength 650MG
| "MENTHOL, CAMPHOR"           -> 2 salts, no strength
| Match 1: same salts + same strength  (best substitute)
| Match 2: same salts, different strength (show separately, with a label)
*/
const splitSalts = (text) =>
  String(text || "")
    .toUpperCase()
    .split(/[,+/]/)
    .map((s) => s.trim())
    .filter(Boolean);

const parseSalt = (part) => {
  const m = part.match(/^(.*?)\s*(\d[\d.]*\s*(?:MG|MCG|G|GM|ML|IU|%)?.*)$/);
  const name = (m ? m[1] : part).replace(/\s+/g, " ").trim();
  const strength = m ? m[2].replace(/\s+/g, "") : "";
  return { name, strength };
};

export const saltKeys = (text) => {
  const parts = splitSalts(text).map(parseSalt);
  if (!parts.length) return null;

  const base = parts
    .map((p) => p.name)
    .sort()
    .join("|");
  const full = parts
    .map((p) => `${p.name} ${p.strength}`.trim())
    .sort()
    .join("|");

  return { base, full, searchTerm: parts[0].name };
};

const formatPrice = (p) => {
  if (p.has_multiple_prices && p.min_price !== p.max_price) {
    return `₹${p.min_price} - ₹${p.max_price}`;
  }
  return `₹${p.min_price ?? p.max_price ?? "-"}`;
};

const formatExpiry = (d) => {
  if (!d) return "-";
  const [y, m] = String(d).slice(0, 10).split("-");
  return `${m}/${String(y).slice(-2)}`;
};

export default function SubstituteModal({
  product,
  branchId,
  onPick,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);

  const keys = useMemo(() => saltKeys(product?.salt_composition), [product]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!keys) {
        setRows([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        // Existing POS API reuse: search salt name, in-stock products only
        const res = await getProducts({
          search: keys.searchTerm,
          ...(branchId ? { branch_id: branchId } : {}),
        });

        if (cancelled) return;
        setRows(res.data.products || []);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load substitutes", e);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [keys, branchId]);

  const { sameStrength, otherStrength } = useMemo(() => {
    const same = [];
    const other = [];

    rows.forEach((p) => {
      if (p.id === product.id || Number(p.total_stock) <= 0) return;

      const k = saltKeys(p.salt_composition);
      if (!k || k.base !== keys.base) return;

      if (k.full === keys.full) same.push(p);
      else other.push(p);
    });

    const byPrice = (a, b) =>
      Number(a.min_price ?? a.max_price ?? 0) -
      Number(b.min_price ?? b.max_price ?? 0);

    return {
      sameStrength: same.sort(byPrice),
      otherStrength: other.sort(byPrice),
    };
  }, [rows, product, keys]);

  const renderRow = (p) => (
    <div
      key={p.id}
      onClick={() => onPick(p)}
      className="touch-manipulation flex items-center justify-between gap-4 p-5 min-h-[88px] rounded-2xl border border-gray-200 bg-white cursor-pointer hover:border-blue-400 hover:shadow-md active:bg-blue-50 transition"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-extrabold text-gray-900">
            {p.name}
          </span>
          {p.drug_schedule && p.drug_schedule !== "none" && (
            <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-red-50 text-red-700 border border-red-200">
              Schedule {p.drug_schedule}
            </span>
          )}
        </div>
        <div className="text-lg text-gray-600">
          {p.brand?.name || p.manufacturer || ""}
          {p.salt_composition ? ` · ${p.salt_composition}` : ""}
        </div>
        <div className="text-xl text-gray-500">
          Nearest expiry: {formatExpiry(p.nearest_expiry)}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-3xl font-bold text-blue-700">{formatPrice(p)}</div>
        <span className="inline-block mt-1 px-3 py-1 rounded-full text-lg font-semibold bg-green-100 text-green-700">
          {formatStock(p.total_stock)} in stock
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-3xl font-bold text-gray-900">Substitutes</h3>
            <p className="text-xl text-gray-600">
              For <span className="font-bold">{product.name}</span>
              {product.salt_composition ? ` · ${product.salt_composition}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation min-h-[48px] rounded-xl border border-gray-300 px-6 text-xl font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            Close
          </button>
        </div>

        {!keys && (
          <p className="text-xl text-gray-500 py-8 text-center">
            This medicine has no salt composition saved, so substitutes cannot
            be found.
          </p>
        )}

        {keys && loading && (
          <p className="text-xl text-gray-500 py-8 text-center">Loading...</p>
        )}

        {keys && error && (
          <p className="text-xl text-red-600 py-8 text-center">
            Could not load substitutes. Please try again.
          </p>
        )}

        {keys && !loading && !error && (
          <>
            <h4 className="text-2xl font-bold text-gray-800 mb-3">
              Same salt &amp; same strength
            </h4>
            {sameStrength.length ? (
              <div className="grid gap-3 mb-8">
                {sameStrength.map(renderRow)}
              </div>
            ) : (
              <p className="text-xl text-gray-500 mb-8">
                No substitute with the same strength is in stock.
              </p>
            )}

            {otherStrength.length > 0 && (
              <>
                <h4 className="text-2xl font-bold text-gray-800 mb-1">
                  Same salt, different strength
                </h4>
                <p className="text-xl text-orange-600 mb-3">
                  The strength is different. Confirm with the doctor or
                  pharmacist before dispensing.
                </p>
                <div className="grid gap-3">{otherStrength.map(renderRow)}</div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
