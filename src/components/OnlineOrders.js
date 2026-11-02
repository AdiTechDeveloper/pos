import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Layout from "./layout";
import { ONLINE_CSS } from "./onlineStyles";

const NEXT = (o, hasStaff, canOverride) => {
  const pickup = o.mode === "pickup";
  switch (o.status) {
    case "placed":
      return [{ to: "accepted", label: "Accept order", primary: true }];
    case "accepted":
      return [
        { to: "preparing", label: "Start packing", primary: true },
        { to: "ready", label: "Mark ready" },
      ];
    case "preparing":
      return [{ to: "ready", label: "Mark ready", primary: true }];
    case "ready":
      if (pickup) {
        return [{ to: "delivered", label: "Handed over", primary: true, confirm: true }];
      }
      // Delivery order: delivery person assign karo, customer ko OTP SMS jayega.
      // OTP ke bina deliver sirf admin / manager (reason ke saath).
      return [
        ...(hasStaff
          ? [{ to: "assign", label: "Assign delivery person", primary: true, assign: true }]
          : []),
        ...(canOverride
          ? [{ to: "delivered", label: "Deliver without OTP", confirm: true, override: true }]
          : []),
      ];
    case "out_for_delivery":
      return [
        ...(hasStaff
          ? [{ to: "reassign", label: o.delivery_name ? "Change person" : "Assign person", primary: true, assign: true }]
          : []),
        { to: "resend_otp", label: "Resend OTP", resend: true },
        { to: "unassign", label: "Take back", unassign: true },
        ...(canOverride
          ? [{ to: "delivered", label: "Deliver without OTP", confirm: true, override: true }]
          : []),
      ];
    default:
      return [];
  }
};

const LABEL = {
  placed: "New",
  accepted: "Accepted",
  preparing: "Packing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const money = (n) => `₹${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;
const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min ago` : new Date(iso).toLocaleString("en-IN");
};
// Order kitne minute se is status mein hai (history ke last entry se)
const minutesIn = (o, status) => {
  const h = [...(o.history || [])].reverse().find((x) => x.status === status);
  return h?.at ? Math.max(0, Math.round((Date.now() - new Date(h.at).getTime()) / 60000)) : 0;
};
const WAIT_ALERT_MINUTES = 5;

const errMsg = (e) => e?.response?.data?.message || e?.message || "Something went wrong.";

// Naye order ki awaaz (browser ko pehle ek click chahiye, isliye "Sound" button se on hoti hai)
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.18);
    });
  } catch (e) {
    /* ignore */
  }
}

export default function OnlineOrders() {
  const [tab, setTab] = useState("active"); // active | history
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // order id jispar kaam chal raha hai
  const [toast, setToast] = useState("");
  const [sound, setSound] = useState(false);
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState("");
  const [deliverFor, setDeliverFor] = useState(null);
  const [staff, setStaff] = useState([]); // delivery persons
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [assignFor, setAssignFor] = useState(null);
  const [assignTo, setAssignTo] = useState("");
  const [unassignFor, setUnassignFor] = useState(null);
  const lastId = useRef(null);
  const role = JSON.parse(localStorage.getItem("user_detail") || "null")?.user?.role;
  const canOverride = role === "admin" || role === "manager";
  const soundRef = useRef(false);
  soundRef.current = sound;

  const load = useCallback(
    async (silent) => {
      if (!silent) setLoading(true);
      try {
        const res = await axios.get("/api/online-orders", {
          params: { status: tab, per_page: 50 },
        });
        const body = res.data;
        setOrders(body.data || []);
        setCounts(body.counts || {});
        setError("");

        // Naya order aaya? (latest_id badha)
        if (lastId.current !== null && body.latest_id > lastId.current) {
          setToast("New online order received!");
          if (soundRef.current) beep();
        }
        lastId.current = body.latest_id;
      } catch (e) {
        if (!silent) setError(errMsg(e));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Delivery persons ki list (assign dropdown ke liye): duty / online status badalta rehta hai, isliye 30 sec mein refresh
  const loadStaff = useCallback(() => {
    axios
      .get("/api/online-orders/delivery-staff")
      .then((r) => {
        setStaff(r.data.data || []);
        setStaffLoaded(true);
        setStaffError("");
      })
      .catch((e) => setStaffError(errMsg(e)));
  }, []);

  useEffect(() => {
    loadStaff();
    const t = setInterval(() => document.visibilityState === "visible" && loadStaff(), 30000);
    return () => clearInterval(t);
  }, [loadStaff]);

  // Har 15 second mein naya order dekho (tab khula ho tab)
  useEffect(() => {
    const t = setInterval(
      () => document.visibilityState === "visible" && load(true),
      15000,
    );
    return () => clearInterval(t);
  }, [load]);

  const newCount = counts.placed || 0;
  useEffect(() => {
    const original = document.title;
    if (newCount) document.title = `(${newCount}) Online orders`;
    return () => {
      document.title = original;
    };
  }, [newCount]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const change = async (order, status, why, override) => {
    setBusy(order.id);
    setError("");
    try {
      await axios.post(`/api/online-orders/${order.id}/status`, {
        status,
        reason: why || undefined,
        override: override || undefined,
      });
      await load(true);
    } catch (e) {
      setError(`${order.order_no}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const assign = async (order, userId) => {
    setBusy(order.id);
    setError("");
    try {
      const res = await axios.post(`/api/online-orders/${order.id}/assign`, {
        delivery_user_id: Number(userId),
      });
      // SMS na jaye to batao: customer apne order page par OTP dekh sakta hai, ya "Resend OTP" dabao
      if (res.data?.otp_sms_sent === false) {
        setToast(`${order.order_no}: assigned, but the OTP SMS could not be sent. Use "Resend OTP".`);
      }
      await Promise.all([load(true), loadStaff()]);
    } catch (e) {
      setError(`${order.order_no}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const resendOtp = async (order) => {
    setBusy(order.id);
    setError("");
    try {
      const res = await axios.post(`/api/online-orders/${order.id}/resend-otp`);
      setToast(`${order.order_no}: ${res.data?.message || "OTP sent."}`);
      await load(true);
    } catch (e) {
      setError(`${order.order_no}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const unassign = async (order, why) => {
    setBusy(order.id);
    setError("");
    try {
      await axios.post(`/api/online-orders/${order.id}/unassign`, { reason: why });
      await Promise.all([load(true), loadStaff()]);
    } catch (e) {
      setError(`${order.order_no}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  // Is order ki branch ke delivery persons
  const staffFor = (o) =>
    staff.filter((u) => (u.branch_ids || []).includes(Number(o.branch_id)));

  const activeTotal = Object.values(counts).reduce((a, b) => a + Number(b), 0);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="ovx">
            <style>{ONLINE_CSS}</style>

            <div className="ovx-head" style={{ alignItems: "center" }}>
              <div className="ovx-titlewrap">
                <span className="ovx-bar" />
                <div>
                  <h3 className="ovx-title">Online orders</h3>
                  <p className="ovx-sub">
                    Orders placed on the online store. New orders show up here by themselves.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSound((s) => !s);
                    if (!sound) beep();
                  }}
                  className={`ovx-btn ovx-btn-outline ${sound ? "ovx-btn-soundon" : ""}`}
                >
                  {sound ? "Sound on" : "Sound off"}
                </button>
                <button type="button" onClick={() => load(false)} className="ovx-btn ovx-btn-outline">
                  Refresh
                </button>
              </div>
            </div>

            <div className="ovx-tabs">
              {[
                ["active", `Active${activeTotal ? ` (${activeTotal})` : ""}`],
                ["history", "History"],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setTab(key)}
                  className={`ovx-tab ${tab === key ? "on" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {toast && <p className="ovx-alert ovx-alert-warn-strong">{toast}</p>}
            {error && <p className="ovx-alert ovx-alert-err">{error}</p>}
            {staffError && (
              <p className="ovx-alert ovx-alert-err">Delivery person list could not load: {staffError}</p>
            )}
            {staffLoaded && staff.length === 0 && (
              <p className="ovx-alert ovx-alert-warn">
                No delivery person found for your branches. Create a staff member with the role "Delivery person" (and add them to the branch) to get the Assign option.
              </p>
            )}
            {staffLoaded && staff.length > 0 && !staff.some((u) => u.on_duty) &&
              orders.some((o) => o.mode === "delivery" && o.status === "ready" && !o.delivery_user_id) && (
                <p className="ovx-alert ovx-alert-warn-strong">
                  No delivery person is on duty. Ready orders will wait until someone goes on duty.
                </p>
              )}

            {loading ? (
              <p className="ovx-center">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="ovx-center">
                {tab === "active" ? "No active online orders right now." : "No past orders yet."}
              </p>
            ) : (
              <div className="ovx-orders">
                {orders.map((o) => {
                  const a = o.address;
                  const actions = NEXT(o, staffFor(o).length > 0, canOverride);
                  const waitMin =
                    o.mode === "delivery" && o.status === "ready" && !o.delivery_user_id
                      ? minutesIn(o, "ready")
                      : 0;
                  const canCancel = !["delivered", "cancelled"].includes(o.status);
                  return (
                    <div
                      key={o.id}
                      className={`ovx-order st-${o.status} ${o.status === "placed" ? "is-new" : ""}`}
                    >
                      <div className="ovx-order-head">
                        <div>
                          <p className="ovx-order-no">{o.order_no}</p>
                          <p className="ovx-small">{ago(o.placed_at)}</p>
                          {o.branch_name && <p className="ovx-small">{o.branch_name}</p>}
                        </div>
                        <div className="ovx-badges">
                          <span className={`ovx-badge b-${o.status}`}>{LABEL[o.status]}</span>
                          <span className="ovx-badge up">{o.mode}</span>
                        </div>
                      </div>

                      <p className="ovx-cust">
                        <strong>{o.customer_name}</strong>
                        {" · "}
                        <a href={`tel:${o.customer_mobile}`}>{o.customer_mobile}</a>
                      </p>
                      {o.mode === "delivery" && a && (
                        <p className="ovx-text">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}
                          {a.landmark ? `, ${a.landmark}` : ""}, {a.city} {a.pincode}
                        </p>
                      )}
                      {o.delivery_name && (
                        <p className="ovx-text">
                          Delivery person: <strong>{o.delivery_name}</strong>
                        </p>
                      )}
                      {o.status === "out_for_delivery" && o.otp && (
                        <p
                          className="ovx-text"
                          style={{ color: o.otp.sms_sent ? "#047857" : "#b45309" }}
                        >
                          {o.otp.locked_until
                            ? "OTP locked after wrong tries. Use Resend OTP or deliver with override."
                            : o.otp.sms_sent
                              ? "Customer OTP SMS sent"
                              : "OTP SMS not sent. The customer can see the OTP on their order page. Use Resend OTP."}
                        </p>
                      )}
                      {waitMin >= WAIT_ALERT_MINUTES && (
                        <p className="ovx-text" style={{ color: "#b91c1c", fontWeight: 600 }}>
                          Waiting for a delivery person for {waitMin} min
                        </p>
                      )}
                      {o.status === "delivered" && o.otp?.overridden && (
                        <p className="ovx-text" style={{ color: "#b45309" }}>
                          Delivered without OTP (manager override)
                        </p>
                      )}
                      {o.note && (
                        <p className="ovx-text" style={{ fontStyle: "italic" }}>
                          Note: {o.note}
                        </p>
                      )}

                      <ul className="ovx-items">
                        {o.items.map((i) => (
                          <li key={i.product_id}>
                            <span>
                              {i.name}{" "}
                              <span style={{ color: "#64748b" }}>
                                × {i.price_unit === "kg" ? `${i.qty} kg` : i.qty}
                              </span>
                            </span>
                            <strong style={{ flexShrink: 0 }}>{money(i.amount)}</strong>
                          </li>
                        ))}
                      </ul>

                      <div className="ovx-total-row">
                        <span className="ovx-text" style={{ margin: 0 }}>
                          {o.payment_method === "cod" ? "Cash on delivery" : "Pay at store"}
                          {o.delivery_fee > 0 ? `, incl. delivery ${money(o.delivery_fee)}` : ""}
                        </span>
                        <span className="ovx-total">{money(o.total)}</span>
                      </div>

                      {o.status === "cancelled" && o.cancel_reason && (
                        <p className="ovx-text" style={{ color: "#b91c1c" }}>
                          Reason: {o.cancel_reason}
                        </p>
                      )}
                      {o.status === "delivered" && o.sales_bill_id && (
                        <p className="ovx-text">POS bill #{o.sales_bill_id} created</p>
                      )}

                      {(actions.length > 0 || canCancel) && (
                        <div className="ovx-order-actions">
                          {actions.map((x) => (
                            <button
                              type="button"
                              key={x.to}
                              disabled={busy === o.id}
                              onClick={() =>
                                x.assign
                                  ? (setAssignFor(o), setAssignTo(o.delivery_user_id ? String(o.delivery_user_id) : ""))
                                  : x.resend
                                    ? resendOtp(o)
                                    : x.unassign
                                      ? (setUnassignFor(o), setReason(""))
                                      : x.confirm
                                        ? (setReason(""), setDeliverFor({ order: o, label: x.label, override: !!x.override }))
                                        : change(o, x.to)
                              }
                              className={`ovx-btn ${x.primary ? "ovx-btn-green" : "ovx-btn-outline"}`}
                            >
                              {busy === o.id ? "Please wait..." : x.label}
                            </button>
                          ))}
                          {canCancel && (
                            <button
                              type="button"
                              disabled={busy === o.id}
                              onClick={() => {
                                setCancelFor(o);
                                setReason("");
                              }}
                              className="ovx-btn ovx-btn-ghost-red"
                            >
                              {o.status === "placed" ? "Reject" : "Cancel"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cancel / reject: wajah likhna zaroori */}
            {cancelFor && (
              <Modal onClose={() => setCancelFor(null)} title={`Cancel ${cancelFor.order_no}?`}>
                <p className="ovx-text" style={{ marginTop: 0 }}>The customer will see this reason.</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="e.g. Item out of stock"
                  className="ovx-input"
                  style={{ marginTop: 14 }}
                />
                <div className="ovx-modal-actions">
                  <button type="button" onClick={() => setCancelFor(null)} className="ovx-btn ovx-btn-outline">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={reason.trim().length < 3}
                    onClick={() => {
                      const o = cancelFor;
                      setCancelFor(null);
                      change(o, "cancelled", reason.trim());
                    }}
                    className="ovx-btn ovx-btn-red"
                  >
                    Cancel order
                  </button>
                </div>
              </Modal>
            )}

            {/* Delivery person chuno */}
            {assignFor && (() => {
              const list = staffFor(assignFor);
              const picked = list.find((u) => String(u.id) === String(assignTo));
              const tag = (u) =>
                !u.on_duty
                  ? "off duty"
                  : `${u.app_online ? "online" : "app closed"}, ${u.active_orders} active`;
              return (
                <Modal onClose={() => setAssignFor(null)} title={`Assign ${assignFor.order_no}`}>
                  <p className="ovx-text" style={{ marginTop: 0 }}>
                    Choose who will deliver this order. It will show on their phone, and the customer gets a delivery OTP by SMS.
                  </p>
                  <select
                    className="ovx-input"
                    style={{ marginTop: 14 }}
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Select delivery person</option>
                    {list.map((u) => (
                      <option
                        key={u.id}
                        value={u.id}
                        disabled={!u.on_duty || u.active_orders >= u.max_active}
                      >
                        {u.name} ({tag(u)})
                      </option>
                    ))}
                  </select>
                  {list.length > 0 && !list.some((u) => u.on_duty) && (
                    <p className="ovx-alert ovx-alert-warn" style={{ marginTop: 12 }}>
                      Nobody is on duty. A delivery person must open the delivery screen and go on duty first.
                    </p>
                  )}
                  {picked && picked.on_duty && !picked.app_online && (
                    <p className="ovx-alert ovx-alert-warn" style={{ marginTop: 12 }}>
                      {picked.name}'s app does not look open right now. They may not see the order. Call them after assigning.
                    </p>
                  )}
                  <div className="ovx-modal-actions">
                    <button type="button" onClick={() => setAssignFor(null)} className="ovx-btn ovx-btn-outline">
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!assignTo}
                      onClick={() => {
                        const o = assignFor;
                        setAssignFor(null);
                        assign(o, assignTo);
                      }}
                      className="ovx-btn ovx-btn-primary"
                    >
                      Assign
                    </button>
                  </div>
                </Modal>
              );
            })()}

            {/* Delivery person se order wapas lo */}
            {unassignFor && (
              <Modal onClose={() => setUnassignFor(null)} title={`Take back ${unassignFor.order_no}?`}>
                <p className="ovx-text" style={{ marginTop: 0 }}>
                  The order goes back to "Ready" and can be assigned to someone else.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="e.g. Delivery person is not reachable"
                  className="ovx-input"
                  style={{ marginTop: 14 }}
                />
                <div className="ovx-modal-actions">
                  <button type="button" onClick={() => setUnassignFor(null)} className="ovx-btn ovx-btn-outline">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={reason.trim().length < 3}
                    onClick={() => {
                      const o = unassignFor;
                      setUnassignFor(null);
                      unassign(o, reason.trim());
                    }}
                    className="ovx-btn ovx-btn-red"
                  >
                    Take back
                  </button>
                </div>
              </Modal>
            )}

            {/* Delivered: POS bill banega, stock katega */}
            {deliverFor && (
              <Modal
                onClose={() => setDeliverFor(null)}
                title={`${deliverFor.label}: ${deliverFor.order.order_no}?`}
              >
                <p className="ovx-text" style={{ marginTop: 0 }}>
                  This will create the POS bill and reduce stock. Collect{" "}
                  {money(deliverFor.order.total)} from the customer
                  {deliverFor.order.payment_method === "cod" ? " (cash on delivery)" : ""}.
                </p>
                {deliverFor.override && (
                  <>
                    <p className="ovx-alert ovx-alert-warn" style={{ marginTop: 12 }}>
                      Normally the delivery person enters the customer's OTP. Use this only if the customer has confirmed the delivery but the OTP did not work. It is saved in the order history.
                    </p>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Reason, e.g. Customer confirmed on call, SMS not received"
                      className="ovx-input"
                      style={{ marginTop: 6 }}
                    />
                  </>
                )}
                <div className="ovx-modal-actions">
                  <button type="button" onClick={() => setDeliverFor(null)} className="ovx-btn ovx-btn-outline">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={deliverFor.override && reason.trim().length < 3}
                    onClick={() => {
                      const { order: o, override } = deliverFor;
                      setDeliverFor(null);
                      change(o, "delivered", override ? reason.trim() : undefined, override);
                    }}
                    className="ovx-btn ovx-btn-green"
                  >
                    Confirm
                  </button>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="ovx-modal-bg" onClick={onClose}>
      <div className="ovx-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ovx-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}