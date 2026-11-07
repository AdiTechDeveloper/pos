import React, { useEffect, useState, useRef } from "react";
import { getProducts, scanBarcode } from "../utils/api";
import BatchSelectModal from "../components/BatchSelectModal";
import SubstituteModal from "../components/SubstituteModal";
import { hasFeature } from "../utils/hasFeature";
import { formatStock, getPackInfo } from "../utils/looseStock";

export default function ProductList({
  selectedCategory,
  selectedBrand,
  addToCart,
  setSelectedCategory,
  setSelectedBrand,
  refreshProducts,
  branchId,
}) {
  const resetFilters = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedBrand(null);
  };

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [batchOptions, setBatchOptions] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const barcodeRef = useRef();

  // 5g: substitutes (pharmacy stores only)
  const isPharmacy = hasFeature("pharmacy");
  const [substituteFor, setSubstituteFor] = useState(null);
  const [outOfStockMatches, setOutOfStockMatches] = useState([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts({
        category_id: selectedCategory,
        brand_id: selectedBrand,
        search,
        ...(branchId ? { branch_id: branchId } : {}),
      });

      const list = res.data.products || [];
      setProducts(list);

      // When the search returns nothing (no stock), look for out-of-stock matches
      // so the cashier can still open their substitutes
      if (isPharmacy && list.length === 0 && search.trim().length >= 2) {
        const r2 = await getProducts({
          search,
          show_out_of_stock: true,
          ...(branchId ? { branch_id: branchId } : {}),
        });
        setOutOfStockMatches(r2.data.products || []);
      } else {
        setOutOfStockMatches([]);
      }
    } catch (e) {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedCategory, selectedBrand, search, refreshProducts, branchId]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, [barcode]);

  const buildCartItem = (product, batch) => {
    const rawInclusive =
      product?.is_gst_inclusive ??
      product?.is_inclusive ??
      product?.gst_inclusive ??
      product?.is_gst_included ??
      batch?.is_gst_inclusive ??
      0;

    const isInclusive =
      rawInclusive === true ||
      rawInclusive === 1 ||
      rawInclusive === "1" ||
      rawInclusive === "true"
        ? 1
        : 0;

    const gstRate = Number(
      product?.gst_rate?.rate ??
        product?.gst_rate ??
        batch?.gst_rate?.rate ??
        batch?.gst_rate ??
        0,
    );

    const is_price_override = Number(product?.is_price_override) === 1 ? 1 : 0;
    const inventoryId = batch.inventory_id || batch.id;
    const totalStock = Number(batch.total_stock ?? batch.qty_available ?? 0);

    const info = getPackInfo(product, batch?.units_per_pack);
    const unitPrice = Number(batch.selling_price); // per single unit
    const packPrice = info.enabled
      ? Math.round(unitPrice * info.perPack * 100) / 100
      : unitPrice;

    return {
      cart_key: `${inventoryId}`,
      inventory_id: inventoryId,

      product_id: product?.id || batch?.product_id,
      name: product?.name || batch?.name,

      batch_no: batch.batch_no,
      selling_price: packPrice, // price of one sale unit (strip)
      unit_price: unitPrice, // price of one single unit
      allow_loose: info.enabled,
      units_per_pack: info.enabled ? info.perPack : 1,
      loose_unit: info.looseLabel,
      pack_type: info.packLabel,
      sale_unit: "pack",
      expiry_date: batch.expiry_date,

      stock: totalStock,
      total_stock: totalStock,
      free_qty: 0,

      gst_percent: gstRate,
      gst_inclusive: isInclusive,

      is_price_override: is_price_override,

      drug_schedule: product?.drug_schedule ?? "none",
      requires_prescription:
        Number(product?.requires_prescription) === 1 ? 1 : 0,
      salt_composition: product?.salt_composition ?? null,

      qty: 1,
    };
  };

  const buildWeightCartItem = (data) => {
    const product = data.product || {};
    const rawInclusive = product.gst_inclusive ?? 0;
    const isInclusive =
      rawInclusive === true ||
      rawInclusive === 1 ||
      rawInclusive === "1" ||
      rawInclusive === "true"
        ? 1
        : 0;

    const gstRate = Number(product.gst_rate?.rate ?? product.gst_rate ?? 0);

    return {
      cart_key: `${data.inventory_id}`,
      inventory_id: data.inventory_id,

      product_id: product.id,
      name: product.name,

      batch_no: data.batch_no,
      selling_price: Number(data.selling_price), // price per kg
      expiry_date: null,

      stock: Number(data.total_stock),
      total_stock: Number(data.total_stock),
      free_qty: 0,

      gst_percent: gstRate,
      gst_inclusive: isInclusive,

      is_price_override: Number(product.is_price_override) === 1 ? 1 : 0,

      qty: Number(data.qty),

      is_weight_item: true,
      unit_label: "kg",
    };
  };

  const handleCardClick = (product) => {
    if (!product.total_stock || product.total_stock <= 0) return;

    // Single Batch Case
    if (product.batch_count <= 1 && product.batches?.length) {
      addToCart(buildCartItem(product, product.batches[0]));
      return;
    }

    // Multiple Batches Case
    setActiveProduct(product);
    setBatchOptions(
      (product.batches || []).map((b) => ({
        ...b,
        product_ref: product,
      })),
    );
    setShowBatchModal(true);
  };

  const handleSubstitutePick = (p) => {
    setSubstituteFor(null);
    handleCardClick(p);
  };

  const handleBarcodeScan = async () => {
    try {
      const res = await scanBarcode(barcode.trim(), branchId);
      const data = res.data || res;

      if (!data?.status) {
        alert(data?.message || "Product not found");
        return;
      }

      if (data.is_weight_item) {
        addToCart(buildWeightCartItem(data));
        return;
      }

      const { product, batches } = data;

      if (!batches || batches.length === 0) {
        alert("Out of stock");
        return;
      }

      if (batches.length === 1) {
        addToCart(buildCartItem(product, batches[0]));
      } else {
        setActiveProduct(product);
        setBatchOptions(batches.map((b) => ({ ...b, product })));
        setShowBatchModal(true);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Product not found";
      alert(errorMessage);
    } finally {
      setBarcode("");
    }
  };

  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return null;
    const diffDays = Math.ceil(
      (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays <= 7) return { level: "critical", diffDays };
    if (diffDays <= 30) return { level: "warning", diffDays };
    return null;
  };

  const criticalCount = products.filter(
    (p) => getExpiryStatus(p.nearest_expiry)?.level === "critical",
  ).length;

  const formatPrice = (p) => {
    if (p.has_multiple_prices && p.min_price !== p.max_price) {
      return `₹${p.min_price} - ₹${p.max_price}`;
    }
    return `₹${p.min_price ?? p.max_price ?? "-"}`;
  };

  return (
    <div className="pos-products">
      <div className="flex gap-6 mb-12">
        <input
          ref={barcodeRef}
          type="text"
          placeholder="Scan barcode..."
          className="border p-5 text-2xl w-96 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && barcode.trim()) {
              handleBarcodeScan();
            }
          }}
        />
        <input
          type="text"
          placeholder="Search product..."
          className="border p-5 text-2xl w-full rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 gap-6">
        {loading &&
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl shadow-md animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-100 rounded mb-2 w-2/3"></div>
              <div className="h-4 bg-gray-100 rounded mb-2 w-1/2"></div>
              <div className="mt-6 flex justify-between items-center">
                <span className="h-8 w-20 bg-gray-200 rounded"></span>
                <span className="h-8 w-20 bg-gray-100 rounded"></span>
              </div>
            </div>
          ))}

        {products.length === 0 && !loading && outOfStockMatches.length > 0 && (
          <div className="col-span-4">
            <h2 className="text-3xl font-bold text-gray-700 mb-2">
              Out of stock
            </h2>
            <p className="text-xl text-gray-500 mb-6">
              This medicine is currently out of stock. View its substitutes:
            </p>
            <div className="grid grid-cols-4 gap-6">
              {outOfStockMatches.map((p) => (
                <div
                  key={p.id}
                  className="p-6 rounded-3xl bg-white border flex flex-col justify-between"
                  style={{ borderLeft: "6px solid #e5e7eb" }}
                >
                  <div>
                    <h3 className="font-extrabold text-2xl leading-tight">
                      {p.name}
                    </h3>
                    <p className="text-lg font-medium text-gray-600 mt-1">
                      {p.brand?.name}
                    </p>
                    {p.salt_composition && (
                      <p className="text-base text-gray-500 mt-1">
                        {p.salt_composition}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full text-base font-semibold bg-red-100 text-red-700">
                      Out of stock
                    </span>
                    {p.salt_composition && (
                      <button
                        type="button"
                        onClick={() => setSubstituteFor(p)}
                        className="touch-manipulation min-h-[48px] px-5 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 active:bg-blue-800"
                      >
                        Substitutes
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 &&
          !loading &&
          outOfStockMatches.length === 0 && (
            <div className="col-span-3 text-center py-20">
              <h2 className="text-5xl font-bold text-gray-700">
                No Products Found
              </h2>
              <p className="text-gray-500 text-2xl mt-8">
                Try adjusting your search, category, or brand filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-8 px-6 py-3 text-xl rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 transition"
              >
                Reset Filters
              </button>
            </div>
          )}

        {!loading &&
          products.map((p) => {
            const expiryStatus = getExpiryStatus(p.nearest_expiry);
            const isCritical = expiryStatus?.level === "critical";
            const isWarning = expiryStatus?.level === "warning";
            const inStock = p.total_stock > 0;
            const packSize =
              Number(p.allow_loose) === 1 ? Number(p.units_per_pack) || 1 : 1;

            return (
              <div
                key={p.id}
                onClick={() => handleCardClick(p)}
                className={`group p-6 rounded-3xl bg-white flex flex-col justify-between transition relative border ${
                  inStock
                    ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                    : "opacity-50 cursor-not-allowed"
                }`}
                style={{
                  borderLeft: isCritical
                    ? "6px solid #dc2626"
                    : isWarning
                      ? "6px solid #f59e0b"
                      : "6px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                {isCritical && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
                    🔥 Sell First
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-extrabold text-2xl leading-tight">
                      {p.name}
                    </h3>
                    {expiryStatus && !isCritical && (
                      <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-bold bg-orange-100 text-orange-800">
                        {expiryStatus.diffDays}d left
                      </span>
                    )}
                    {isCritical && (
                      <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-bold bg-red-600 text-white mt-8">
                        {expiryStatus.diffDays <= 0
                          ? "Expires Today"
                          : `${expiryStatus.diffDays}d left`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-lg font-medium text-gray-600">
                      {p.brand?.name}
                    </p>

                    {p.last_purchase_bill_no && (
                      <span className="px-2 py-0.5 text-xl font-semibold text-indigo-800 bg-indigo-100 rounded">
                        #{p.last_purchase_bill_no}
                      </span>
                    )}
                  </div>

                  {p.drug_schedule && p.drug_schedule !== "none" && (
                    <span className="inline-block mt-2 mr-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-bold border border-red-200">
                      Schedule {p.drug_schedule}
                    </span>
                  )}
                  {p.salt_composition && (
                    <p className="text-base text-gray-500 mt-1">
                      {p.salt_composition}
                    </p>
                  )}

                  {(p.batch_count > 1 ||
                    (isPharmacy && p.salt_composition)) && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {p.batch_count > 1 ? (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                          {p.batch_count} batches
                        </span>
                      ) : (
                        <span />
                      )}

                      {isPharmacy && p.salt_composition && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubstituteFor(p);
                          }}
                          className="touch-manipulation min-h-[48px] px-5 rounded-xl border-2 border-blue-600 bg-blue-50 text-blue-700 text-lg font-bold hover:bg-blue-100 active:bg-blue-200 transition"
                        >
                          ⇄ Substitutes
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-3xl font-bold text-blue-700">
                    {formatPrice(p)}
                    {Number(p.allow_loose) === 1 && (
                      <span className="text-lg font-semibold text-gray-500">
                        {" "}
                        / {p.pack_type || "strip"}
                      </span>
                    )}
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-lg font-semibold ${
                      p.total_stock /
                        (Number(p.allow_loose) === 1
                          ? Number(p.units_per_pack) || 1
                          : 1) <
                      5
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {formatStock(p.total_stock, p)} in stock
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {substituteFor && (
        <SubstituteModal
          product={substituteFor}
          branchId={branchId}
          onPick={handleSubstitutePick}
          onClose={() => setSubstituteFor(null)}
        />
      )}

      {showBatchModal && (
        <BatchSelectModal
          options={batchOptions}
          onSelect={(selectedBatch) => {
            addToCart(buildCartItem(activeProduct, selectedBatch));
            setShowBatchModal(false);
          }}
          onClose={() => setShowBatchModal(false)}
        />
      )}
    </div>
  );
}
