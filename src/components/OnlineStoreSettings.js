import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import Layout from "./layout";
import { ONLINE_CSS } from "./onlineStyles";
import { ONLINE_TABLE_STYLES } from "./onlineTableStyles";
import OnlineProductLimits from "./OnlineProductLimits";
import StoreLogoUpload from "./StoreLogoUpload";

const STOREFRONT_URL =
  process.env.REACT_APP_STOREFRONT_URL || "https://store.vakro.in";

const errorText = (err, fallback) => {
  const errors = err?.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return err?.response?.data?.message || fallback;
};

const EMPTY = {
  is_online_enabled: true,
  slug: "",
  display_name: "",
  about: "",
  phone: "",
  address: "",
  open_time: "",
  close_time: "",
  accepts_delivery: true,
  accepts_pickup: true,
  min_order_amount: "0",
  delivery_charge: "0",
  free_delivery_above: "",
  prep_minutes: "10",
  online_stock_percent: "50",
  max_qty_per_product: ""
};

// API se aaya data -> form (sab kuch string, taaki input control rahe)
const toForm = (s) => ({
  is_online_enabled: !!s.is_online_enabled,
  slug: s.slug || "",
  display_name: s.display_name || "",
  about: s.about || "",
  phone: s.phone || "",
  address: s.address || "",
  open_time: s.open_time || "",
  close_time: s.close_time || "",
  accepts_delivery: !!s.accepts_delivery,
  accepts_pickup: !!s.accepts_pickup,
  min_order_amount: String(s.min_order_amount ?? 0),
  delivery_charge: String(s.delivery_charge ?? 0),
  free_delivery_above:
    s.free_delivery_above === null || s.free_delivery_above === undefined
      ? ""
      : String(s.free_delivery_above),
  prep_minutes: String(s.prep_minutes ?? 30),
  online_stock_percent: String(s.online_stock_percent ?? 50),
  max_qty_per_product:
    s.max_qty_per_product === null || s.max_qty_per_product === undefined
      ? ""
      : String(s.max_qty_per_product),
});

function Card({ title, hint, children }) {
  return (
    <section className="ovx-card">
      <h4 className="ovx-card-title">{title}</h4>
      {hint && <p className="ovx-card-hint">{hint}</p>}
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="ovx-field">
      <span className="ovx-label">{label}</span>
      {children}
      {hint && <span className="ovx-fhint">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`ovx-toggle ${checked ? "on" : ""}`}
    >
      <span>
        <span className="ovx-toggle-title">{label}</span>
        {hint && <span className="ovx-toggle-hint">{hint}</span>}
      </span>
      <span className="ovx-switch">
        <span className="ovx-knob" />
      </span>
    </button>
  );
}

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

const showAmount = (v) =>
  v === null || v === undefined || v === "" ? (
    <span className="ovx-dim">Default</span>
  ) : (
    `₹${v}`
  );

export default function OnlineStoreSettings() {
  const user_data = JSON.parse(localStorage.getItem("user_detail") || "null");
  const role = user_data?.user?.role;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [storeName, setStoreName] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [listings, setListings] = useState([]);
  const [pincodes, setPincodes] = useState([]);

  // naye pincodes ka form
  const [pins, setPins] = useState("");
  const [pinCharge, setPinCharge] = useState("");
  const [pinMin, setPinMin] = useState("");
  const [adding, setAdding] = useState(false);

  // pincode table: inline edit
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ delivery_charge: "", min_order_amount: "" });
  const [rowSaving, setRowSaving] = useState(false);

  const apply = useCallback((data) => {
    setStoreName(data.store_name || "");
    setForm(toForm(data.settings));
    setListings(data.listings || []);
    setPincodes(data.pincodes || []);
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      try {
        const res = await axios.get("/api/online/settings");
        apply(res.data.data);
      } catch (e) {
        setLoadError(errorText(e, "Could not load online store settings."));
      } finally {
        setLoading(false);
      }
    })();
  }, [role, apply]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setBool = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const num = (v, d = 0) => (v === "" || v === null ? d : Number(v));
      const payload = {
        ...form,
        slug: form.slug.trim() || null,
        min_order_amount: num(form.min_order_amount),
        delivery_charge: num(form.delivery_charge),
        free_delivery_above:
          form.free_delivery_above === "" ? null : Number(form.free_delivery_above),
        prep_minutes: num(form.prep_minutes, 30),
        online_stock_percent: num(form.online_stock_percent, 50),
        open_time: form.open_time || null,
        close_time: form.close_time || null,
        max_qty_per_product:
          form.max_qty_per_product === "" ? null : Number(form.max_qty_per_product),
      };
      const res = await axios.put("/api/online/settings", payload);
      apply(res.data.data);
      toast.success("Online store settings saved.");
    } catch (err) {
      const msg = errorText(err, "Could not save settings.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const addPincodes = async () => {
    if (!pins.trim()) {
      toast.error("Enter at least one pincode.");
      return;
    }
    setAdding(true);
    try {
      const body = { pincodes: pins };
      if (pinCharge !== "") body.delivery_charge = Number(pinCharge);
      if (pinMin !== "") body.min_order_amount = Number(pinMin);
      const res = await axios.post("/api/online/pincodes", body);
      setPincodes(res.data.data);
      setPins("");
      setPinCharge("");
      setPinMin("");
      toast.success(res.data.message || "Pincodes added.");
    } catch (err) {
      toast.error(errorText(err, "Could not add pincodes."));
    } finally {
      setAdding(false);
    }
  };

  const updatePincode = async (id, body) => {
    try {
      const res = await axios.put(`/api/online/pincodes/${id}`, body);
      setPincodes(res.data.data);
      return true;
    } catch (err) {
      toast.error(errorText(err, "Could not update the pincode."));
      return false;
    }
  };

  const deletePincode = async (row) => {
    if (!window.confirm(`Remove pincode ${row.pincode}? Customers there will not get delivery.`))
      return;
    try {
      const res = await axios.delete(`/api/online/pincodes/${row.id}`);
      setPincodes(res.data.data);
    } catch (err) {
      toast.error(errorText(err, "Could not remove the pincode."));
    }
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setDraft({
      delivery_charge: row.delivery_charge ?? "",
      min_order_amount: row.min_order_amount ?? "",
    });
  };

  const saveEdit = async (row) => {
    setRowSaving(true);
    const ok = await updatePincode(row.id, {
      delivery_charge: draft.delivery_charge === "" ? null : Number(draft.delivery_charge),
      min_order_amount: draft.min_order_amount === "" ? null : Number(draft.min_order_amount),
    });
    setRowSaving(false);
    if (ok) setEditId(null);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied.");
    } catch (e) {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const pincodeColumns = [
    {
      name: "Pincode",
      selector: (r) => r.pincode,
      sortable: true,
      cell: (r) => <strong style={{ fontSize: 15 }}>{r.pincode}</strong>,
    },
    {
      name: "Charge (₹)",
      selector: (r) => Number(r.delivery_charge ?? 0),
      sortable: true,
      cell: (r) =>
        editId === r.id ? (
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Default"
            className="ovx-input ovx-sm"
            value={draft.delivery_charge}
            onChange={(e) => setDraft((d) => ({ ...d, delivery_charge: e.target.value }))}
          />
        ) : (
          showAmount(r.delivery_charge)
        ),
    },
    {
      name: "Min order (₹)",
      selector: (r) => Number(r.min_order_amount ?? 0),
      sortable: true,
      cell: (r) =>
        editId === r.id ? (
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Default"
            className="ovx-input ovx-sm"
            value={draft.min_order_amount}
            onChange={(e) => setDraft((d) => ({ ...d, min_order_amount: e.target.value }))}
          />
        ) : (
          showAmount(r.min_order_amount)
        ),
    },
    {
      name: "Status",
      width: "130px",
      cell: (r) => (
        <button
          type="button"
          onClick={() => updatePincode(r.id, { is_active: !r.is_active })}
          title="Click to toggle"
          style={{
            padding: "3px 12px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            background: r.is_active ? "#dcfce7" : "#f1f5f9",
            color: r.is_active ? "#15803d" : "#64748b",
          }}
        >
          {r.is_active ? "Active" : "Inactive"}
        </button>
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
              disabled={rowSaving}
              onClick={() => saveEdit(r)}
            >
              {rowSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="ovx-btn ovx-btn-outline ovx-btn-sm"
              disabled={rowSaving}
              onClick={() => setEditId(null)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ovx-btn ovx-btn-edit ovx-btn-sm" onClick={() => startEdit(r)}>
              <IconEdit />
            </button>
            <button type="button" className="ovx-btn ovx-btn-del ovx-btn-sm" onClick={() => deletePincode(r)}>
              <IconTrash /> 
            </button>
          </div>
        ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="ovx">
            <style>{ONLINE_CSS}</style>

            <div className="ovx-head">
              <div className="ovx-titlewrap">
                <span className="ovx-bar" />
                <div>
                  <h3 className="ovx-title">Online store settings</h3>
                  <p className="ovx-sub">
                    {storeName
                      ? `Control how ${storeName} appears and delivers on the online store.`
                      : "Control how your store appears and delivers on the online store."}
                  </p>
                </div>
              </div>
              <nav className="ovx-crumb">
                <span>Dashboard</span>
                <span>&rsaquo;</span>
                <span className="ovx-muted">Online Settings</span>
              </nav>
            </div>

            {role !== "admin" ? (
              <p className="ovx-card">Only the store admin can change online store settings.</p>
            ) : loading ? (
              <p className="ovx-center">Loading...</p>
            ) : loadError ? (
              <p className="ovx-alert ovx-alert-err">{loadError}</p>
            ) : (
              <>
                <form onSubmit={save}>
                  <Card
                    title="Online store"
                    hint="Turn this off to hide all your branches from the online store."
                  >
                    <Toggle
                      checked={form.is_online_enabled}
                      onChange={setBool("is_online_enabled")}
                      label={form.is_online_enabled ? "Online store is ON" : "Online store is OFF"}
                      hint="Customers can find your branches and place orders when this is on."
                    />
                  </Card>

                  <Card title="Store details" hint="Shown to customers on the online store.">
                    <StoreLogoUpload storeName={storeName} />
                    <div className="ovx-grid2">
                      <Field label="Display name" hint="Leave empty to use your store name.">
                        <input className="ovx-input" value={form.display_name} onChange={set("display_name")} maxLength={150} />
                      </Field>
                      <Field label="Store link name" hint="Small letters, numbers and hyphens only. Leave empty to create it automatically.">
                        <input className="ovx-input" value={form.slug} onChange={set("slug")} maxLength={100} placeholder="my-store" />
                      </Field>
                      <Field label="Phone">
                        <input className="ovx-input" value={form.phone} onChange={set("phone")} maxLength={20} inputMode="tel" />
                      </Field>
                      <Field label="Address" hint="Each branch uses its own address when it has one.">
                        <input className="ovx-input" value={form.address} onChange={set("address")} maxLength={255} />
                      </Field>
                    </div>
                    <div className="ovx-mt">
                      <Field label="About the store">
                        <textarea className="ovx-input" rows={4} maxLength={1000} value={form.about} onChange={set("about")} />
                      </Field>
                    </div>
                  </Card>


                  <div className="ovx-pair">
                    <Card
                      title="Timings"
                      hint="Orders are accepted only between these times. Leave both empty for always open."
                    >
                      <div className="ovx-grid2">
                        <Field label="Opens at">
                          <input type="time" className="ovx-input" value={form.open_time} onChange={set("open_time")} />
                        </Field>
                        <Field label="Closes at">
                          <input type="time" className="ovx-input" value={form.close_time} onChange={set("close_time")} />
                        </Field>
                      </div>
                    </Card>

                    <Card
                      title="Stock kept for online orders"
                      hint="Customers can order only this share of each product's shelf stock. The rest stays for the counter."
                    >
                      <Field
                        label="Online stock share (%)"
                        hint="Example: 50% of 11 pieces means 5 pieces can be ordered online."
                      >
                        <input type="number" min="0" max="100" className="ovx-input" value={form.online_stock_percent} onChange={set("online_stock_percent")} />
                      </Field>
                      <Field
                        label="Max quantity per product (per order)"
                        hint="Default for every product. Leave empty for no limit. You can set a different limit for a product below."
                      >
                        <input type="number" min="1" className="ovx-input" value={form.max_qty_per_product} onChange={set("max_qty_per_product")} />
                      </Field>
                    </Card>
                  </div>

                  <Card title="Delivery and pickup" hint="Choose how customers get their orders and what it costs.">
                    <div className="ovx-grid2">
                      <Toggle
                        checked={form.accepts_delivery}
                        onChange={setBool("accepts_delivery")}
                        label="Home delivery"
                        hint="Only to the pincodes listed below."
                      />
                      <Toggle
                        checked={form.accepts_pickup}
                        onChange={setBool("accepts_pickup")}
                        label="Pickup from store"
                        hint="Customer collects and pays at the store."
                      />
                    </div>
                    <div className="ovx-grid4 ovx-mt">
                      <Field label="Delivery charge (₹)" hint="Used for pincodes that have no charge of their own.">
                        <input type="number" min="0" step="0.01" className="ovx-input" value={form.delivery_charge} onChange={set("delivery_charge")} />
                      </Field>
                      <Field label="Free delivery above (₹)" hint="Leave empty for no free delivery.">
                        <input type="number" min="0" step="0.01" className="ovx-input" value={form.free_delivery_above} onChange={set("free_delivery_above")} />
                      </Field>
                      <Field label="Minimum order (₹)" hint="Minimum amount for home delivery.">
                        <input type="number" min="0" step="0.01" className="ovx-input" value={form.min_order_amount} onChange={set("min_order_amount")} />
                      </Field>
                      <Field label="Prepare time (min)" hint="Time to prepare an order.">
                        <input type="number" min="0" max="1440" className="ovx-input" value={form.prep_minutes} onChange={set("prep_minutes")} />
                      </Field>
                    </div>
                  </Card>

                  {formError && <p className="ovx-alert ovx-alert-err">{formError}</p>}

                  <div className="ovx-actions">
                    <button type="submit" disabled={saving} className="ovx-btn ovx-btn-primary">
                      {saving ? "Saving..." : "Save settings"}
                    </button>
                  </div>
                </form>

                <Card
                  title="Delivery areas (pincodes)"
                  hint="Customers get home delivery only at these pincodes. A charge or minimum order left empty uses the store default."
                >
                  <div className="ovx-box">
                    <Field label="Add pincodes" hint="Type or paste many, separated by commas, spaces or new lines.">
                      <textarea
                        className="ovx-input"
                        rows={2}
                        value={pins}
                        onChange={(e) => setPins(e.target.value)}
                        placeholder="380001, 380015, 380054"
                      />
                    </Field>
                    <div className="ovx-grid3 ovx-mt">
                      <Field label="Delivery charge (₹)">
                        <input type="number" min="0" step="0.01" className="ovx-input" value={pinCharge} onChange={(e) => setPinCharge(e.target.value)} placeholder="Store default" />
                      </Field>
                      <Field label="Minimum order (₹)">
                        <input type="number" min="0" step="0.01" className="ovx-input" value={pinMin} onChange={(e) => setPinMin(e.target.value)} placeholder="Store default" />
                      </Field>
                      <button
                        type="button"
                        onClick={addPincodes}
                        disabled={adding}
                        className="ovx-btn ovx-btn-primary ovx-btn-full"
                      >
                        {adding ? "Adding..." : "Add pincodes"}
                      </button>
                    </div>
                  </div>

                  {pincodes.length === 0 ? (
                    <p className="ovx-alert ovx-alert-warn ovx-mt">
                      No delivery areas yet. Customers can only choose pickup until you add a pincode.
                    </p>
                  ) : (
                    <div className="ovx-mt">
                      <DataTable
                        columns={pincodeColumns}
                        data={pincodes}
                        customStyles={ONLINE_TABLE_STYLES}
                        highlightOnHover
                        responsive
                        pagination={pincodes.length > 10}
                      />
                    </div>
                  )}
                </Card>

                <OnlineProductLimits defaultLimit={form.max_qty_per_product} />

                {listings.length > 0 && (
                  <Card
                    title="Online store links"
                    hint="Every branch has its own page on the online store. Share these links or make a QR code from them."
                  >
                    <ul className="ovx-list">
                      {listings.map((l) => {
                        const url = `${STOREFRONT_URL}/s/${l.slug}`;
                        return (
                          <li key={l.branch_id}>
                            <div style={{ minWidth: 0 }}>
                              <p className="ovx-list-name">{l.name}</p>
                              <a href={url} target="_blank" rel="noreferrer">
                                {url}
                              </a>
                            </div>
                            <button type="button" onClick={() => copy(url)} className="ovx-btn ovx-btn-outline ovx-btn-sm">
                              Copy link
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}