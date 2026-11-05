import { useEffect, useMemo, useState } from "react";

// Admin panel: order accept karte waqt (ya baad me) delivery ka time badhane ka popup, Swiggy / Zomato jaisa.
//
// Props:
//  open          popup dikhe ya nahi
//  orderNo       title me dikhane ke liye
//  currentEtaIso order ka abhi ka delivery time (order.eta_at). Na ho to 30 min maan kar preview dikhata hai
//  confirmText   button ka naam, jaise "Accept order" ya "Update time"
//  busy / error  parent se: request chal rahi hai / server ka error
//  onClose()     band karo
//  onConfirm({ add_minutes?, until?, note? })
//      - kuch na badla ("Keep default") to add_minutes aur until dono undefined aate hain
//      - until = unix seconds (kal subah 10 baje jaise)
//
// Backend: add_minutes / until / note ko OnlineOrder::extendEta($addMinutes, $untilTs, $note) me do.

const QUICK = [
  { key: "default", label: "Keep default time", add: 0 },
  { key: "10", label: "+10 min", add: 10 },
  { key: "15", label: "+15 min", add: 15 },
  { key: "30", label: "+30 min", add: 30 },
  { key: "45", label: "+45 min", add: 45 },
  { key: "60", label: "+1 hour", add: 60 },
  { key: "120", label: "+2 hours", add: 120 },
  { key: "1440", label: "+1 day", add: 1440 },
  { key: "4320", label: "+3 days", add: 4320 },
  { key: "custom", label: "Pick date and time (up to 7 days)" },
];

const REASONS = [
  "High order volume",
  "Waiting for stock",
  "Delivery partner not available",
  "Will deliver tomorrow",
];

const MAX_DAYS = 7;

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const whenText = (d) => {
  const dayStart = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((dayStart(d) - dayStart(new Date())) / 86400000);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (diff <= 0) return `today, ${time}`;
  if (diff === 1) return `tomorrow, ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
};

export default function DeliveryTimePicker({
  open,
  orderNo,
  currentEtaIso,
  confirmText = "Accept order",
  busy = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const [choice, setChoice] = useState("default");
  const [custom, setCustom] = useState("");
  const [reason, setReason] = useState("");

  // Har baar popup khule to saaf shuruaat
  useEffect(() => {
    if (open) {
      setChoice("default");
      setCustom("");
      setReason("");
    }
  }, [open]);

  const base = useMemo(() => {
    const t = currentEtaIso ? new Date(currentEtaIso).getTime() : NaN;
    // Abhi ka time guzar chuka ho to ab se gino
    return new Date(Number.isFinite(t) && t > Date.now() ? t : Date.now() + 30 * 60000);
  }, [currentEtaIso, open]);

  const bounds = useMemo(() => {
    const now = new Date();
    return { min: toLocalInput(now), max: toLocalInput(new Date(now.getTime() + MAX_DAYS * 86400000)) };
  }, [open]);

  if (!open) return null;

  const quick = QUICK.find((q) => q.key === choice);
  const customDate = custom ? new Date(custom) : null;
  const customOk =
    !!customDate &&
    customDate.getTime() > Date.now() &&
    customDate.getTime() <= Date.now() + MAX_DAYS * 86400000;

  let newTime = null;
  if (choice === "default") newTime = base;
  else if (choice === "custom") newTime = customOk ? customDate : null;
  else newTime = new Date(base.getTime() + quick.add * 60000);

  // Chip se jodne par 7 din se zyada ho jaye (pehle se badhaya hua time) to server mana karega: pehle hi roko
  const tooFar = !!newTime && newTime.getTime() > Date.now() + MAX_DAYS * 86400000;

  const canConfirm = !busy && !tooFar && (choice !== "custom" || customOk);

  const submit = () => {
    if (!canConfirm) return;
    const note = reason.trim();
    if (choice === "default") return onConfirm({});
    if (choice === "custom") {
      return onConfirm({ until: Math.floor(customDate.getTime() / 1000), note });
    }
    return onConfirm({ add_minutes: quick.add, note });
  };

  return (
    <div className="dtp-bg" onClick={() => !busy && onClose()}>
      <style>{CSS}</style>
      <div className="dtp-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="dtp-title">Delivery time{orderNo ? ` · ${orderNo}` : ""}</h3>
        <p className="dtp-sub">Choose how long the customer should wait. They see the new time and your reason.</p>

        <div className="dtp-chips">
          {QUICK.map((q) => (
            <button
              type="button"
              key={q.key}
              className={`dtp-chip ${choice === q.key ? "on" : ""}`}
              onClick={() => setChoice(q.key)}
            >
              {q.label}
            </button>
          ))}
        </div>

        {choice === "custom" && (
          <div className="dtp-field">
            <label className="dtp-label" htmlFor="dtp-custom">
              Deliver by (up to {MAX_DAYS} days ahead)
            </label>
            <input
              id="dtp-custom"
              type="datetime-local"
              className="dtp-input"
              min={bounds.min}
              max={bounds.max}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            {custom && !customOk && <p className="dtp-err">Pick a time in the future, within {MAX_DAYS} days.</p>}
          </div>
        )}

        {choice !== "default" && (
          <div className="dtp-field">
            <p className="dtp-label">Reason (the customer sees this)</p>
            <div className="dtp-chips">
              {REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`dtp-chip small ${reason === r ? "on" : ""}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              className="dtp-input"
              maxLength={150}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or write your own reason (optional)"
            />
          </div>
        )}

        <div className="dtp-preview">
          {newTime ? (
            <>
              Customer will see: <strong>delivery {whenText(newTime)}</strong>
            </>
          ) : (
            "Pick a date and time"
          )}
        </div>

        {tooFar && <p className="dtp-err">That is more than {MAX_DAYS} days away. Choose a shorter time.</p>}
        {error && <p className="dtp-err">{error}</p>}

        <div className="dtp-actions">
          <button type="button" className="dtp-btn dtp-btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="dtp-btn dtp-btn-primary" onClick={submit} disabled={!canConfirm}>
            {busy ? "Saving..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.dtp-bg{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px}
.dtp-box{background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:92vh;overflow:auto;padding:22px;box-shadow:0 20px 50px rgba(15,23,42,.3);font-family:inherit;color:#111827}
.dtp-title{margin:0;font-size:20px;font-weight:800}
.dtp-sub{margin:4px 0 14px;font-size:13px;color:#6b7280}
.dtp-chips{display:flex;flex-wrap:wrap;gap:8px}
.dtp-chip{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:9px 14px;font-size:14px;font-weight:600;color:#374151;cursor:pointer}
.dtp-chip.small{font-size:12px;padding:7px 11px}
.dtp-chip.on{background:#2f63f6;border-color:#2f63f6;color:#fff}
.dtp-field{margin-top:14px}
.dtp-label{display:block;margin:0 0 6px;font-size:13px;font-weight:700;color:#374151}
.dtp-input{width:100%;height:44px;border:1px solid #d1d5db;border-radius:10px;padding:0 12px;font-size:15px;font-family:inherit;margin-top:8px}
.dtp-field .dtp-input:first-of-type{margin-top:0}
.dtp-input:focus{outline:none;border-color:#2f63f6}
.dtp-preview{margin-top:16px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:10px;padding:12px 14px;font-size:14px}
.dtp-err{margin:8px 0 0;font-size:13px;font-weight:600;color:#b91c1c}
.dtp-actions{display:flex;gap:10px;margin-top:18px}
.dtp-btn{flex:1;height:46px;border-radius:10px;border:1px solid transparent;font-size:15px;font-weight:700;cursor:pointer}
.dtp-btn:disabled{opacity:.5;cursor:not-allowed}
.dtp-btn-primary{background:#2f63f6;color:#fff}
.dtp-btn-outline{background:#fff;color:#111827;border-color:#d1d5db}
`;