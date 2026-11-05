import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import { ONLINE_TABLE_STYLES } from "./onlineTableStyles";

const PER_PAGE = 15;

const errText = (err, fallback) => {
  const errors = err?.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return err?.response?.data?.message || fallback;
};

const hasValue = (v) => v !== "" && v !== null && v !== undefined;

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// Settings page ke andar lagta hai (OnlineStoreSettings.jsx). defaultLimit = store ka default (khali = koi limit nahi).
// Classes wahi hain jo is page ki onlineStyles.js mein pehle se hain (ovx-*).
export default function OnlineProductLimits({ defaultLimit }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [q, setQ] = useState(""); // search jo server ko gaya (typing ke 0.4 second baad)
  const [only, setOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [resetPg, setResetPg] = useState(false); // DataTable ka page 1 pe reset
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
      setResetPg((v) => !v);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/online/product-limits", {
        params: { search: q, only_limited: only ? 1 : 0, page, per_page: PER_PAGE },
      });
      setRows(res.data.data || []);
      setMeta(res.data.meta || { current_page: 1, last_page: 1, total: 0 });
    } catch (e) {
      setError(errText(e, "Could not load products."));
    } finally {
      setLoading(false);
    }
  }, [q, only, page]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (row) => {
    setEditId(row.id);
    setVal(hasValue(row.max_qty) ? String(row.max_qty) : "");
  };

  const save = async (row, value) => {
    setSaving(true);
    try {
      const res = await axios.put(`/api/online/product-limits/${row.id}`, {
        max_qty: value === "" || value === null ? null : Number(value),
      });
      const next = res.data.data.max_qty;
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, max_qty: next } : r)));
      setEditId(null);
      toast.success(next === null ? "Limit removed." : "Limit saved.");
      if (only && next === null) load(); // "sirf limit wale" list se hat jaye
    } catch (err) {
      toast.error(errText(err, "Could not save the limit."));
    } finally {
      setSaving(false);
    }
  };

  const defaultText = hasValue(defaultLimit) ? `Store default (${defaultLimit})` : "No limit";

  const columns = [
    {
      name: "Product",
      grow: 2,
      cell: (r) => (
        <div style={{ padding: "8px 0", minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "#111827" }}>{r.name}</div>
          {r.sku && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{r.sku}</div>}
        </div>
      ),
    },
    {
      name: "Max per order",
      grow: 1,
      cell: (r) =>
        editId === r.id ? (
          <input
            type="number"
            min="1"
            step={r.is_weight ? "0.01" : "1"}
            className="ovx-input ovx-sm"
            value={val}
            autoFocus
            onChange={(e) => setVal(e.target.value)}
            placeholder="Default"
          />
        ) : hasValue(r.max_qty) ? (
          <span
            style={{
              padding: "3px 12px",
              borderRadius: 999,
              background: "#dbeafe",
              color: "#1d4ed8",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {r.max_qty}
            {r.is_weight ? " kg" : ""}
          </span>
        ) : (
          <span className="ovx-dim">{defaultText}</span>
        ),
    },
    {
      name: "Actions",
      right: true,
      width: "240px",
      cell: (r) =>
        editId === r.id ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="ovx-btn ovx-btn-primary ovx-btn-sm"
              disabled={saving}
              onClick={() => save(r, val)}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="ovx-btn ovx-btn-outline ovx-btn-sm"
              disabled={saving}
              onClick={() => setEditId(null)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ovx-btn ovx-btn-edit ovx-btn-sm" onClick={() => startEdit(r)}>
              <IconEdit /> {hasValue(r.max_qty) ? "" : ""}
            </button>
            {hasValue(r.max_qty) && (
              <button type="button" className="ovx-btn ovx-btn-del ovx-btn-sm" onClick={() => save(r, null)}>
                <IconTrash /> 
              </button>
            )}
          </div>
        ),
    },
  ];

  return (
    <section className="ovx-card">
      <h4 className="ovx-card-title">Order limit per product</h4>
      <p className="ovx-card-hint">
        The most a customer can buy of one product in a single order. A product without its own limit uses the store
        default above. Stock still applies, so the customer never gets more than what is available.
      </p>

      <div className="ovx-grid3">
        <label className="ovx-field">
          <span className="ovx-label">Search products</span>
          <input
            className="ovx-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, SKU or barcode"
          />
        </label>
        <label className="ovx-field" style={{ justifyContent: "flex-end" }}>
          <span className="ovx-label">&nbsp;</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, fontSize: 14 }}>
            <input
              type="checkbox"
              className="ovx-check"
              checked={only}
              onChange={(e) => {
                setOnly(e.target.checked);
                setPage(1);
                setResetPg((v) => !v);
              }}
            />
            Only products with their own limit
          </span>
        </label>
      </div>

      {error && <p className="ovx-alert ovx-alert-err ovx-mt">{error}</p>}

      <div className="ovx-mt">
        <DataTable
          columns={columns}
          data={rows}
          customStyles={ONLINE_TABLE_STYLES}
          highlightOnHover
          responsive
          progressPending={loading}
          progressComponent={<p className="ovx-center">Loading...</p>}
          noDataComponent={
            <p className="ovx-alert ovx-alert-warn" style={{ margin: 16 }}>
              {only ? "No product has its own limit yet." : "No products found."}
            </p>
          }
          pagination
          paginationServer
          paginationTotalRows={meta.total || 0}
          paginationPerPage={PER_PAGE}
          paginationRowsPerPageOptions={[PER_PAGE]}
          paginationDefaultPage={page}
          paginationResetDefaultPage={resetPg}
          onChangePage={(p) => setPage(p)}
        />
      </div>
    </section>
  );
}