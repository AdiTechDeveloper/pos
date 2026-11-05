import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

// Delivery person ka screen (role = delivery). Route: /delivery
// - Mobile-first, POS ka sidebar / menu nahi, POS ka koi link nahi.
// - Naya order assign hone par awaaz + vibration + banner (screen khuli ho tab).
// - Order sirf customer ke OTP se deliver hota hai.
// - Customer ne map par jo exact pin rakha tha, "Navigate" usi par le jata hai (pin na ho to address text se search).

const POLL_MS = 8000;
const ALERT_REPEAT_MS = 6000;
const ALERT_REPEAT_MAX = 10;
const LS_ALERTS = "dvx_alerts_on";
const LS_DISMISSED = "dvx_dismissed_cancelled";

const FAIL_REASONS = [
  "Customer not answering the phone",
  "Customer not at home",
  "Wrong or incomplete address",
  "Customer refused the order",
  "Could not find the location",
];

const money = (n) => `₹${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;
const errMsg = (e) => e?.response?.data?.message || e?.message || "Something went wrong.";
const addressText = (a) =>
  a ? [a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(", ") : "";
const minsAgo = (iso) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ${m % 60} min ago`;
};
const timeOf = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

function playAlert(ctx) {
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    [784, 988, 1319].forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.22;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      o.start(start);
      o.stop(start + 0.22);
    });
  } catch (e) {
    /* ignore */
  }
}

const buzz = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
  } catch (e) {
    /* ignore */
  }
};

export default function DeliveryOrders() {
  const [orders, setOrders] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [stats, setStats] = useState({ done: 0, cash: 0 });
  const [name, setName] = useState("");
  const [onDuty, setOnDuty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(""); // 403: account / store issue, kuch nahi kar sakte
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState("active"); // active | done
  const [history, setHistory] = useState({ data: [], count: 0, cash_total: 0 });
  const [, setTick] = useState(0);

  const [banner, setBanner] = useState(null); // { count }
  const [alertsOn, setAlertsOn] = useState(() => localStorage.getItem(LS_ALERTS) === "1");
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_DISMISSED) || "[]");
    } catch (e) {
      return [];
    }
  });

  // OTP modal
  const [otpFor, setOtpFor] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendWait, setResendWait] = useState(0);
  const [resendMsg, setResendMsg] = useState("");

  // Failed modal
  const [failFor, setFailFor] = useState(null);
  const [reason, setReason] = useState("");

  const knownIds = useRef(null);
  const audioRef = useRef(null);
  const wakeRef = useRef(null);
  const bannerRef = useRef(null);
  bannerRef.current = banner;

  // Browser awaaz tabhi bajne deta hai jab user ne pehle screen par tap kiya ho (duty / "Turn on" / OTP button)
  const unlockAudio = useCallback(() => {
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioRef.current = new Ctx();
      }
      if (audioRef.current?.state === "suspended") audioRef.current.resume();
    } catch (e) {
      /* ignore */
    }
  }, []);

  const ring = useCallback(() => {
    playAlert(audioRef.current);
    buzz();
  }, []);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get("/api/delivery/orders");
      const body = res.data;
      const list = body.data || [];

      setOrders(list);
      setCancelled(body.cancelled || []);
      setStats({ done: body.done_today || 0, cash: body.cash_today || 0 });
      setName(body.name || "");
      setOnDuty(!!body.on_duty);
      setError("");
      setOffline(false);
      setBlocked("");

      // Naya order assign hua? (pehli baar sirf yaad rakhte hain, alert nahi)
      const ids = list.map((o) => o.id);
      if (knownIds.current !== null) {
        const fresh = list.filter((o) => !knownIds.current.includes(o.id));
        if (fresh.length > 0) {
          setBanner({ count: fresh.length, numbers: fresh.map((o) => o.order_no) });
          ring();
          if (
            document.visibilityState !== "visible" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("New delivery assigned", {
                body: fresh.map((o) => o.order_no).join(", "),
                tag: "dvx-new-order",
              });
            } catch (e) {
              /* ignore */
            }
          }
        }
      }
      knownIds.current = ids;
    } catch (e) {
      if (!e.response) {
        setOffline(true);
      } else if (e.response.status === 403) {
        setBlocked(errMsg(e));
      } else if (!silent) {
        setError(errMsg(e));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ring]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get("/api/delivery/history");
      setHistory({
        data: res.data.data || [],
        count: res.data.count || 0,
        cash_total: res.data.cash_total || 0,
      });
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  // Har 8 second mein order dekho (screen khuli ho tab) + "Last seen" bhi isi se update hota hai
  useEffect(() => {
    load(false);
    const t = setInterval(() => document.visibilityState === "visible" && load(true), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [load]);

  // "x min ago" ke liye
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (tab === "done") loadHistory();
  }, [tab, loadHistory]);

  // Banner jab tak "Got it" na dabe, awaaz dobara bajti rahe (bike par hote hue miss na ho)
  useEffect(() => {
    if (!banner) return undefined;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (n > ALERT_REPEAT_MAX || !bannerRef.current) {
        clearInterval(t);
        return;
      }
      ring();
    }, ALERT_REPEAT_MS);
    return () => clearInterval(t);
  }, [banner, ring]);

  // Duty par ho to screen band na ho (warna polling ruk jati hai)
  useEffect(() => {
    if (!onDuty || !navigator.wakeLock) return undefined;
    let released = false;
    const acquire = async () => {
      try {
        wakeRef.current = await navigator.wakeLock.request("screen");
      } catch (e) {
        /* ignore */
      }
    };
    acquire();
    const onVis = () => !released && document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVis);
      try {
        wakeRef.current?.release();
      } catch (e) {
        /* ignore */
      }
    };
  }, [onDuty]);

  // Title mein pending count
  useEffect(() => {
    const original = document.title;
    document.title = orders.length ? `(${orders.length}) Deliveries` : "Deliveries";
    return () => {
      document.title = original;
    };
  }, [orders.length]);

  // "Add to home screen" ke liye manifest (is page ke liye start_url = /delivery)
  useEffect(() => {
    let url;
    let link;
    try {
      const manifest = {
        name: "Vakaro Delivery",
        short_name: "Delivery",
        start_url: `${window.location.origin}/delivery`,
        scope: `${window.location.origin}/`,
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          {
            src:
              "data:image/svg+xml;utf8," +
              encodeURIComponent(
                "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' rx='20' fill='#0f172a'/><text x='48' y='64' font-size='52' text-anchor='middle' fill='#22c55e' font-family='Arial' font-weight='700'>D</text></svg>",
              ),
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      };
      url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
      link = document.createElement("link");
      link.rel = "manifest";
      link.href = url;
      document.head.appendChild(link);
    } catch (e) {
      /* ignore */
    }
    return () => {
      try {
        if (link) document.head.removeChild(link);
        if (url) URL.revokeObjectURL(url);
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Resend ka countdown
  useEffect(() => {
    if (resendWait <= 0) return undefined;
    const t = setTimeout(() => setResendWait((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  const enableAlerts = async () => {
    unlockAudio();
    ring();
    localStorage.setItem(LS_ALERTS, "1");
    setAlertsOn(true);
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        /* ignore */
      }
    }
  };

  const toggleDuty = async () => {
    unlockAudio();
    setError("");
    try {
      const res = await axios.post("/api/delivery/duty", { on_duty: !onDuty });
      setOnDuty(!!res.data.on_duty);
      setNotice(res.data.message || "");
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const logout = async () => {
    if (orders.length > 0) {
      setError(`You still have ${orders.length} order(s) out for delivery. Finish or return them before logging out.`);
      return;
    }
    try {
      if (onDuty) await axios.post("/api/delivery/duty", { on_duty: false });
      await axios.post("/api/logout");
    } catch (e) {
      /* token pehle hi khatam ho sakta hai */
    }
    localStorage.removeItem("user_detail");
    window.location.href = "/";
  };

  // ---------- OTP ----------
  const openOtp = (o) => {
    unlockAudio();
    setOtpFor(o);
    setOtp("");
    setOtpError("");
    setResendMsg("");
    setResendWait(0);
  };

  const closeOtp = () => {
    setOtpFor(null);
    setOtp("");
    setOtpError("");
  };

  const submitOtp = async () => {
    if (!otpFor || otp.length !== 4 || otpBusy) return;
    setOtpBusy(true);
    setOtpError("");
    try {
      await axios.post(`/api/delivery/orders/${otpFor.id}/delivered`, { otp });
      const no = otpFor.order_no;
      closeOtp();
      setNotice(`${no} delivered.`);
      await load(true);
      if (tab === "done") loadHistory();
    } catch (e) {
      const status = e.response?.status;
      if (status === 409) {
        // Order cancel / badal gaya
        closeOtp();
        setError(`${otpFor.order_no}: ${errMsg(e)}`);
        await load(true);
      } else {
        setOtpError(errMsg(e));
        setOtp("");
        if (status === 423) await load(true); // lock ki jaankari taaza karo
      }
    } finally {
      setOtpBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!otpFor || resendWait > 0) return;
    setResendMsg("");
    setOtpError("");
    try {
      const res = await axios.post(`/api/delivery/orders/${otpFor.id}/resend-otp`);
      setResendMsg(res.data?.message || "OTP sent again.");
      setResendWait(res.data?.retry_after || 60);
      await load(true);
    } catch (e) {
      setResendWait(e.response?.data?.retry_after || 0);
      setOtpError(errMsg(e));
      await load(true);
    }
  };

  // ---------- Failed ----------
  const submitFailed = async () => {
    const o = failFor;
    const why = reason.trim();
    if (!o || why.length < 3) return;
    setFailFor(null);
    setBusy(o.id);
    setError("");
    try {
      await axios.post(`/api/delivery/orders/${o.id}/failed`, { reason: why });
      setNotice(`${o.order_no} sent back to the store.`);
      await load(true);
    } catch (e) {
      setError(`${o.order_no}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const dismissCancelled = (id) => {
    const next = [...dismissed, id].slice(-50);
    setDismissed(next);
    localStorage.setItem(LS_DISMISSED, JSON.stringify(next));
  };

  // OTP modal ke liye taaza order data (lock / resends_left poll se badalte hain)
  const liveOtpOrder = otpFor ? orders.find((o) => o.id === otpFor.id) || otpFor : null;
  const lockedUntil = liveOtpOrder?.otp_locked_until ? new Date(liveOtpOrder.otp_locked_until) : null;
  const isLocked = !!lockedUntil && lockedUntil.getTime() > Date.now();
  const visibleCancelled = cancelled.filter((c) => !dismissed.includes(c.id));
  const notifBlocked = "Notification" in window && Notification.permission === "denied";

  if (blocked) {
    return (
      <div className="dvx">
        <style>{CSS}</style>
        <div className="dvx-wrap">
          <div className="dvx-card">
            <h2 className="dvx-h2">Delivery is not available</h2>
            <p className="dvx-text">{blocked}</p>
            <button type="button" className="dvx-btn dvx-btn-outline" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dvx">
      <style>{CSS}</style>

      <header className="dvx-top">
        <div className="dvx-top-in">
          <div className="dvx-who">
            <p className="dvx-hello">{name ? name : "Delivery"}</p>
            <p className="dvx-sub">{onDuty ? "You are on duty" : "You are off duty"}</p>
          </div>
          <button
            type="button"
            onClick={toggleDuty}
            className={`dvx-duty ${onDuty ? "on" : ""}`}
            aria-pressed={onDuty}
          >
            <span className="dvx-dot" />
            {onDuty ? "On duty" : "Off duty"}
          </button>
        </div>
      </header>

      <main className="dvx-wrap">
        {offline && <p className="dvx-alert dvx-alert-warn">No internet. Trying again... Your orders below may be old.</p>}
        {error && <p className="dvx-alert dvx-alert-err">{error}</p>}
        {notice && <p className="dvx-alert dvx-alert-ok">{notice}</p>}

        {banner && (
          <div className="dvx-newbanner" role="alert">
            <div>
              <strong>
                {banner.count > 1 ? `${banner.count} new deliveries` : "New delivery assigned"}
              </strong>
              <p className="dvx-small" style={{ color: "#fff", opacity: 0.9, margin: "2px 0 0" }}>
                {banner.numbers.join(", ")}
              </p>
            </div>
            <button type="button" className="dvx-btn dvx-btn-white" onClick={() => setBanner(null)}>
              Got it
            </button>
          </div>
        )}

        {!alertsOn && (
          <div className="dvx-alert dvx-alert-warn dvx-row">
            <span>Turn on alerts so you hear a sound when a new order comes.</span>
            <button type="button" className="dvx-btn dvx-btn-dark dvx-btn-sm" onClick={enableAlerts}>
              Turn on
            </button>
          </div>
        )}
        {alertsOn && notifBlocked && (
          <p className="dvx-alert dvx-alert-warn">
            Notifications are blocked in your browser. Keep this screen open to hear new order sounds.
          </p>
        )}
        {!onDuty && (
          <p className="dvx-alert dvx-alert-warn">
            You are off duty, so the store cannot assign new orders to you. Tap "Off duty" above to start.
          </p>
        )}
        {onDuty && (
          <p className="dvx-hint">Keep this screen open while on duty to get new orders.</p>
        )}

        {visibleCancelled.map((c) => (
          <div key={c.id} className="dvx-alert dvx-alert-err">
            <strong>{c.order_no} was cancelled by the store. Do not deliver it.</strong>
            {c.cancel_reason && <p className="dvx-small" style={{ margin: "4px 0 0" }}>Reason: {c.cancel_reason}</p>}
            <button
              type="button"
              className="dvx-btn dvx-btn-outline dvx-btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => dismissCancelled(c.id)}
            >
              OK
            </button>
          </div>
        ))}

        <section className="dvx-stats">
          <div className="dvx-stat">
            <p className="dvx-stat-n">{orders.length}</p>
            <p className="dvx-stat-l">Out now</p>
          </div>
          <div className="dvx-stat">
            <p className="dvx-stat-n">{stats.done}</p>
            <p className="dvx-stat-l">Delivered today</p>
          </div>
          <div className="dvx-stat">
            <p className="dvx-stat-n">{money(stats.cash)}</p>
            <p className="dvx-stat-l">Cash today</p>
          </div>
        </section>

        <div className="dvx-tabs">
          <button type="button" className={`dvx-tab ${tab === "active" ? "on" : ""}`} onClick={() => setTab("active")}>
            My orders{orders.length ? ` (${orders.length})` : ""}
          </button>
          <button type="button" className={`dvx-tab ${tab === "done" ? "on" : ""}`} onClick={() => setTab("done")}>
            Done today
          </button>
        </div>

        {tab === "active" &&
          (loading ? (
            <p className="dvx-center">Loading...</p>
          ) : orders.length === 0 ? (
            <div className="dvx-empty">
              <p style={{ fontWeight: 600, margin: 0 }}>No deliveries right now</p>
              <p className="dvx-small" style={{ margin: "6px 0 0" }}>
                {onDuty ? "New orders will show up here by themselves." : "Go on duty to receive orders."}
              </p>
            </div>
          ) : (
            <div className="dvx-list">
              {orders.map((o) => {
                const addr = addressText(o.address);
                const cod = o.payment_method === "cod";
                const callTo = o.address?.mobile || o.customer_mobile;
                // Exact pin ka link backend se aata hai. Na aaye (purana order) to address text se search.
                const hasPin = !!o.address?.has_pin;
                const mapsUrl =
                  o.address?.maps_url ||
                  (addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null);
                return (
                  <article key={o.id} className="dvx-card">
                    <div className="dvx-card-head">
                      <div>
                        <p className="dvx-orderno">{o.order_no}</p>
                        <p className="dvx-small">
                          Assigned {minsAgo(o.assigned_at)}
                          {o.assigned_at ? ` · ${timeOf(o.assigned_at)}` : ""}
                        </p>
                      </div>
                      <span className="dvx-badge">Out for delivery</span>
                    </div>

                    <p className="dvx-cust">{o.customer_name}</p>
                    {addr && <p className="dvx-text">{addr}</p>}
                    {o.note && <p className="dvx-text dvx-italic">Note: {o.note}</p>}

                    <div className="dvx-actions2">
                      <a href={`tel:${callTo}`} className="dvx-btn dvx-btn-outline">
                        Call customer
                      </a>
                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noreferrer" className="dvx-btn dvx-btn-blue">
                          {hasPin ? "Navigate to customer" : "Open in Maps"}
                        </a>
                      )}
                    </div>
                    <p className="dvx-small" style={{ marginTop: 8 }}>
                      {hasPin
                        ? "Exact map pin saved by the customer."
                        : "No exact pin: address was typed by hand. Call the customer if you cannot find it."}
                    </p>

                    <ul className="dvx-items">
                      {o.items.map((i) => (
                        <li key={i.product_id}>
                          <span>{i.name}</span>
                          <span className="dvx-qty">× {i.price_unit === "kg" ? `${i.qty} kg` : i.qty}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={`dvx-pay ${cod ? "cod" : "paid"}`}>
                      <span>{cod ? "Collect cash" : "Already paid"}</span>
                      <span className="dvx-pay-amt">{cod ? money(o.total) : money(0)}</span>
                    </div>

                    <div className="dvx-actions2" style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => openOtp(o)}
                        className="dvx-btn dvx-btn-green dvx-grow2"
                      >
                        Delivered · enter OTP
                      </button>
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => {
                          setFailFor(o);
                          setReason("");
                        }}
                        className="dvx-btn dvx-btn-red-outline"
                      >
                        Can't deliver
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}

        {tab === "done" && (
          <>
            <div className="dvx-pay paid" style={{ marginBottom: 12 }}>
              <span>
                {history.count} delivered · cash collected
              </span>
              <span className="dvx-pay-amt">{money(history.cash_total)}</span>
            </div>
            {history.data.length === 0 ? (
              <div className="dvx-empty">
                <p style={{ fontWeight: 600, margin: 0 }}>Nothing delivered yet today</p>
              </div>
            ) : (
              <div className="dvx-list">
                {history.data.map((o) => (
                  <article key={o.id} className="dvx-card dvx-card-sm">
                    <div className="dvx-card-head">
                      <div>
                        <p className="dvx-orderno">{o.order_no}</p>
                        <p className="dvx-small">
                          {o.customer_name} · {timeOf(o.delivered_at)}
                        </p>
                      </div>
                      <strong>{o.payment_method === "cod" ? money(o.cod_collected ?? o.total) : "Paid"}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <div className="dvx-foot">
          <button type="button" className="dvx-btn dvx-btn-outline dvx-btn-sm" onClick={() => load(false)}>
            Refresh
          </button>
          <button type="button" className="dvx-btn dvx-btn-outline dvx-btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </main>

      {/* OTP se delivery pakki karo */}
      {otpFor && liveOtpOrder && (
        <div className="dvx-modal-bg" onClick={closeOtp}>
          <div className="dvx-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dvx-h2">Confirm delivery · {liveOtpOrder.order_no}</h2>

            {liveOtpOrder.payment_method === "cod" ? (
              <div className="dvx-pay cod" style={{ marginTop: 10 }}>
                <span>1. Collect cash</span>
                <span className="dvx-pay-amt">{money(liveOtpOrder.total)}</span>
              </div>
            ) : (
              <p className="dvx-text" style={{ marginTop: 8 }}>1. Hand over the order.</p>
            )}
            <p className="dvx-text" style={{ margin: "12px 0 6px" }}>
              2. Ask the customer for the 4-digit OTP they got by SMS.
            </p>

            <input
              className="dvx-otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={4}
              autoFocus
              disabled={isLocked || otpBusy}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
                setOtpError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && submitOtp()}
              placeholder="••••"
              aria-label="Customer OTP"
            />

            {isLocked && (
              <p className="dvx-alert dvx-alert-err" style={{ marginTop: 10 }}>
                Too many wrong tries. Locked until {timeOf(liveOtpOrder.otp_locked_until)}. Please call the store.
              </p>
            )}
            {otpError && !isLocked && <p className="dvx-alert dvx-alert-err" style={{ marginTop: 10 }}>{otpError}</p>}
            {resendMsg && <p className="dvx-alert dvx-alert-ok" style={{ marginTop: 10 }}>{resendMsg}</p>}

            <button
              type="button"
              className="dvx-btn dvx-btn-green"
              style={{ width: "100%", marginTop: 14 }}
              disabled={otp.length !== 4 || otpBusy || isLocked}
              onClick={submitOtp}
            >
              {otpBusy ? "Checking..." : "Confirm delivery"}
            </button>

            <div className="dvx-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="dvx-link"
                disabled={resendWait > 0 || (liveOtpOrder.otp_resends_left ?? 1) <= 0}
                onClick={resendOtp}
              >
                {(liveOtpOrder.otp_resends_left ?? 1) <= 0
                  ? "Resend limit reached"
                  : resendWait > 0
                    ? `Resend OTP in ${resendWait}s`
                    : "Customer did not get OTP? Resend"}
              </button>
              <button type="button" className="dvx-link" onClick={closeOtp}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver nahi ho paya */}
      {failFor && (
        <div className="dvx-modal-bg" onClick={() => setFailFor(null)}>
          <div className="dvx-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dvx-h2">Could not deliver {failFor.order_no}</h2>
            <p className="dvx-text" style={{ marginTop: 6 }}>
              The order goes back to the store. Tell them why.
            </p>
            <div className="dvx-chips">
              {FAIL_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`dvx-chip ${reason === r ? "on" : ""}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="dvx-input"
              rows={3}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or write the reason"
            />
            <div className="dvx-actions2" style={{ marginTop: 14 }}>
              <button type="button" className="dvx-btn dvx-btn-outline" onClick={() => setFailFor(null)}>
                Back
              </button>
              <button
                type="button"
                className="dvx-btn dvx-btn-red"
                disabled={reason.trim().length < 3}
                onClick={submitFailed}
              >
                Send back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.dvx{position:fixed;inset:0;height:100vh;height:100dvh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;scrollbar-width:thin;background:#f1f5f9;color:#0f172a;font-family:Poppins,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
.dvx *{box-sizing:border-box}
.dvx p{margin:0}
.dvx-top{position:sticky;top:0;z-index:20;background:#0f172a;color:#fff;padding-top:env(safe-area-inset-top,0px)}
.dvx-top-in{max-width:560px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.dvx-hello{font-size:17px;font-weight:600;line-height:1.2}
.dvx-sub{font-size:12px;opacity:.75;margin-top:2px}
.dvx-duty{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:10px 16px;min-height:44px;font-size:14px;font-weight:600;background:#334155;color:#e2e8f0;cursor:pointer}
.dvx-duty.on{background:#16a34a;color:#fff}
.dvx-dot{width:10px;height:10px;border-radius:50%;background:#94a3b8}
.dvx-duty.on .dvx-dot{background:#bbf7d0;box-shadow:0 0 0 4px rgba(187,247,208,.3)}
.dvx-wrap{max-width:560px;margin:0 auto;padding:14px 16px calc(40px + env(safe-area-inset-bottom,0px))}
.dvx-alert{border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.4;margin-bottom:12px}
.dvx-alert-err{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
.dvx-alert-warn{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
.dvx-alert-ok{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
.dvx-hint{font-size:12px;color:#64748b;margin:0 0 12px;text-align:center}
.dvx-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dvx-newbanner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#16a34a;color:#fff;border-radius:14px;padding:14px 16px;margin-bottom:12px;animation:dvxpulse 1.2s ease-in-out infinite}
@keyframes dvxpulse{0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}50%{box-shadow:0 0 0 8px rgba(22,163,74,0)}}
.dvx-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.dvx-stat{background:#fff;border-radius:12px;padding:12px 8px;text-align:center;border:1px solid #e2e8f0}
.dvx-stat-n{font-size:18px;font-weight:700}
.dvx-stat-l{font-size:11px;color:#64748b;margin-top:2px}
.dvx-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.dvx-tab{border:1px solid #cbd5e1;background:#fff;border-radius:12px;min-height:46px;font-size:14px;font-weight:600;color:#475569;cursor:pointer}
.dvx-tab.on{background:#0f172a;color:#fff;border-color:#0f172a}
.dvx-list{display:grid;gap:12px}
.dvx-card{background:#fff;border-radius:16px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.dvx-card-sm{padding:12px 14px}
.dvx-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.dvx-orderno{font-size:16px;font-weight:700}
.dvx-small{font-size:12px;color:#64748b}
.dvx-badge{background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600;white-space:nowrap}
.dvx-cust{font-size:16px;font-weight:600;margin-top:12px}
.dvx-text{font-size:14px;color:#334155;margin-top:4px;line-height:1.45}
.dvx-italic{font-style:italic}
.dvx-actions2{display:flex;gap:10px;margin-top:14px}
.dvx-actions2>*{flex:1}
.dvx-grow2{flex:2!important}
.dvx-items{list-style:none;margin:14px 0 0;padding:12px 0 0;border-top:1px dashed #e2e8f0;display:grid;gap:6px}
.dvx-items li{display:flex;justify-content:space-between;gap:10px;font-size:14px}
.dvx-qty{color:#64748b;white-space:nowrap}
.dvx-pay{display:flex;align-items:center;justify-content:space-between;border-radius:12px;padding:12px 14px;margin-top:14px;font-size:14px;font-weight:600}
.dvx-pay.cod{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
.dvx-pay.paid{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
.dvx-pay-amt{font-size:20px;font-weight:700}
.dvx-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:50px;padding:0 14px;border-radius:12px;border:1px solid transparent;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;text-align:center;line-height:1.2}
.dvx-btn:disabled{opacity:.5;cursor:not-allowed}
.dvx-btn-sm{min-height:40px;font-size:13px;padding:0 12px}
.dvx-btn-green{background:#16a34a;color:#fff}
.dvx-btn-blue{background:#2563eb;color:#fff}
.dvx-btn-dark{background:#0f172a;color:#fff}
.dvx-btn-white{background:#fff;color:#166534;min-height:44px}
.dvx-btn-red{background:#dc2626;color:#fff}
.dvx-btn-red-outline{background:#fff;color:#b91c1c;border-color:#fca5a5}
.dvx-btn-outline{background:#fff;color:#0f172a;border-color:#cbd5e1}
.dvx-foot{display:flex;justify-content:space-between;gap:10px;margin-top:22px}
.dvx-center{text-align:center;color:#64748b;padding:30px 0}
.dvx-empty{background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:30px 16px;text-align:center;color:#334155}
.dvx-h2{font-size:18px;font-weight:700;margin:0}
.dvx-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.6);display:flex;align-items:flex-end;justify-content:center;z-index:50}
.dvx-modal{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));max-height:92vh;overflow:auto}
@media (min-width:600px){.dvx-modal-bg{align-items:center}.dvx-modal{border-radius:20px}}
.dvx-otp{display:block;width:100%;height:64px;border:2px solid #cbd5e1;border-radius:14px;text-align:center;font-size:32px;letter-spacing:14px;font-weight:700;color:#0f172a;background:#fff;padding-left:14px}
.dvx-otp:focus{outline:none;border-color:#16a34a}
.dvx-link{background:none;border:0;color:#2563eb;font-size:14px;font-weight:600;padding:10px 0;cursor:pointer;min-height:44px;text-align:left}
.dvx-link:disabled{color:#94a3b8;cursor:not-allowed}
.dvx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.dvx-chip{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:10px 14px;font-size:13px;color:#334155;cursor:pointer;min-height:40px}
.dvx-chip.on{background:#0f172a;color:#fff;border-color:#0f172a}
.dvx-input{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:15px;font-family:inherit;resize:none}
.dvx-input:focus{outline:none;border-color:#2563eb}
`;