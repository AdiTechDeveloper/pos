import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useCachedApi, invalidateDashboardCache } from "./Dashboardcache";
import Layout from "./layout";
import ProfitLossWidget from "./ProfitLossWidget";
import LowStockAlert from "./lowStockAlert";
import StatCard from "./StatCard";
import TopLowSellingProducts from "./TopLowSellingProducts";
import CustomerDuesWidget from "./CustomerDuesWidget";
import RecentSalesFeed from "./RecentSalesFeed";
import { hasFeature } from "../utils/hasFeature";
import { useAppData } from "../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Apni sidebar ke hisaab se ye paths badal lena
const ROUTES = {
  newSale: "/sales-bill",
  addExpense: "/expenses",
  addProduct: "/create-product",
  products: "/product",
  newPurchase: "/purchase",
  dues: "/customer-dues",
  ai: "/ai-insights",
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const PREV_LABEL = {
  today: "vs yesterday",
  week: "vs last week",
  month: "vs last month",
};

const autoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
};

const selectCss = `
  .dash-select {
    height: 40px !important;
    min-width: 190px;
    width: auto !important;
    padding: 0 38px 0 14px !important;
    font-size: 15px !important;
    line-height: 38px !important;
    color: #111827 !important;
    background-color: #fff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 10px !important;
    box-shadow: none !important;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 14px;
    cursor: pointer;
  }
  .dash-select:focus { outline: 2px solid #2f63f6; outline-offset: 1px; }
  .dash-menu-item:hover { background: #f1f5f9 !important; }
  .dash-select-sm { height: 36px !important; min-width: 150px; line-height: 34px !important; font-size: 14px !important; padding-left: 12px !important; }
  .dash-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: stretch; margin-bottom: 32px; }
  .dash-grid > div { min-width: 0; }
  .dash-grid > div > * { height: 100%; box-sizing: border-box; }
  .dash-grid > div:last-child:nth-child(odd) { grid-column: 1 / -1; }
  @media (max-width: 1024px) { .dash-grid { grid-template-columns: 1fr; } }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

const compact = (v) => {
  const n = Number(v) || 0;
  const t = (x) => x.toFixed(1).replace(/\.0$/, "");
  if (n >= 1e7) return `₹${t(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${t(n / 1e5)}L`;
  if (n >= 1e3) return `₹${t(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
};

const MAIN_SECTIONS =
  "sales,profit,expenses,payments,top_profit,stock_risk,dead_stock,expiry,customers_due_count,branches";

const billsText = (n) => `${n} ${Number(n) === 1 ? "bill" : "bills"}`;

const hourLabel = (h) => {
  const next = (h + 1) % 24;
  const f = (x) => `${x % 12 === 0 ? 12 : x % 12}${x < 12 ? "am" : "pm"}`;
  return `${f(h)} – ${f(next)}`;
};

const iconProps = {
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const IconStore = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M5 9v10h14V9" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

const IconSpark = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
    <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
  </svg>
);

const TONE = {
  red: "#dc2626",
  amber: "#f59e0b",
  blue: "#2f63f6",
  green: "#16a34a",
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

const card = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(15, 23, 42, .08)",
  padding: 20,
  height: "100%",
  boxSizing: "border-box",
};

const Card = ({ title, hint, right, children }) => (
  <div style={card}>
    {(title || right) && (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
            {title}
          </div>
          {hint && (
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>
              {hint}
            </div>
          )}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

const Delta = ({ cur, prev, label }) => {
  if (!prev) {
    return <span style={{ fontSize: 14, color: "#6b7280" }}>No earlier data to compare</span>;
  }
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 14, fontWeight: 600, color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%{" "}
      <span style={{ fontWeight: 500, color: "#6b7280" }}>{label}</span>
    </span>
  );
};

const Kpi = ({ label, value, sub, accent }) => (
  <div style={{ ...card, borderTop: `3px solid ${accent}`, padding: "18px 20px" }}>
    <div style={{ fontSize: 15, fontWeight: 600, color: "#4b5563" }}>{label}</div>
    <div
      style={{
        fontSize: 30,
        fontWeight: 800,
        color: "#111827",
        lineHeight: 1.2,
        marginTop: 6,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
    <div style={{ marginTop: 6, fontSize: 14, color: "#6b7280" }}>{sub}</div>
  </div>
);

const Mini = ({ label, value, sub }) => (
  <div style={{ ...card, padding: "14px 18px" }}>
    <div style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginTop: 2 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{sub}</div>}
  </div>
);

const Row = ({ left, sub, right, rightColor }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid #f1f5f9",
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#111827",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {left}
      </div>
      {sub && <div style={{ fontSize: 14, color: "#6b7280" }}>{sub}</div>}
    </div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: rightColor || "#111827",
        whiteSpace: "nowrap",
      }}
    >
      {right}
    </div>
  </div>
);

const Empty = ({ children }) => (
  <div style={{ fontSize: 15, color: "#6b7280", padding: "8px 0" }}>{children}</div>
);

const SERIES = [
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "1y", label: "1Y" },
];

const SERIES_TITLE = {
  "1d": "Today",
  "1w": "Last 7 days",
  "1m": "Last 30 days",
  "1y": "Last 12 months",
};

const VS_LABEL = {
  "1d": "vs yesterday (same time)",
  "1w": "vs previous 7 days",
  "1m": "vs previous 30 days",
  "1y": "vs previous 12 months",
};

const hourShort = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

function pointLabel(series, p, long) {
  if (series === "1d") return long ? `Today, ${hourLabel(p.k)}` : hourShort(p.k);
  const d = new Date(`${p.k}T00:00:00`);
  if (series === "1y") {
    return d.toLocaleDateString("en-IN", long ? { month: "long", year: "numeric" } : { month: "short" });
  }
  if (series === "1w") {
    return d.toLocaleDateString(
      "en-IN",
      long ? { weekday: "long", day: "numeric", month: "short" } : { weekday: "short", day: "numeric" }
    );
  }
  return d.toLocaleDateString(
    "en-IN",
    long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" }
  );
}

const tickIndexes = (series, n) => {
  if (series === "1d") return [0, 6, 12, 18, 23].filter((i) => i < n);
  const all = Array.from({ length: n }, (_, i) => i);
  return series === "1m" ? all.filter((i) => i % 6 === 0) : all;
};

const DOWNLOAD_OPTIONS = [
  ["pdf", "PDF report (.pdf)", "Summary, breakdown and bills, ready to print"],
  ["xlsx", "Excel report (.xlsx)", "Summary, breakdown and every bill"],
  // ["csv", "CSV file (.csv)", "Every bill, for use in other tools"],
];

const dateInputStyle = {
  width: "100%",
  height: 34,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "0 6px",
  fontSize: 13,
  boxSizing: "border-box",
};

function SalesTrendCard({ token, branchId }) {
  const [series, setSeries] = useState("1w");
  const [hover, setHover] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const todayStr = new Date().toLocaleDateString("en-CA");
  const menuRef = useRef(null);

  const { data, loading } = useCachedApi(
    `${BASE_URL}/api/dashboard/insights`,
    { series, branch_id: branchId || 0, only: "trend_series" },
    { token }
  );

  useEffect(() => {
    setHover(null);
  }, [series]);

  // close the download menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return undefined;

    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const esc = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const download = async (kind) => {
    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      toast.error("Please select both From and To dates.");
      return;
    }
    if (fromDate && toDate && fromDate > toDate) {
      toast.error("From date cannot be after To date.");
      return;
    }

    setMenuOpen(false);
    setDownloading(true);

    try {
      const params = { series, branch_id: branchId || 0, format: kind };
      if (fromDate && toDate) {
        params.from = fromDate;
        params.to = toDate;
      }

      const res = await axios.get(`${BASE_URL}/api/dashboard/sales-report`, {
        params,
        responseType: "blob",
        headers: { Accept: "*/*", Authorization: `Bearer ${token}` },
      });

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        fromDate && toDate
          ? `sales-report-${fromDate}-to-${toDate}.${kind}`
          : `sales-report-${series}-${new Date().toLocaleDateString("en-CA")}.${kind}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Sales report downloaded");
    } catch (err) {
      console.error("Sales report error:", err?.response || err);
      toast.error("Could not download the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const ts = data?.trend_series;
  const points = ts?.points || [];
  const n = points.length;
  const valid = points.map((p, i) => ({ p, i })).filter((x) => x.p.total !== null);
  const totals = valid.map((x) => x.p.total);

  const W = 600;
  const H = 200;
  const AREA = 220;
  const pad = 8;
  const max = Math.max(...totals, 1);

  const xPct = (i) => ((pad + (i * (W - pad * 2)) / Math.max(n - 1, 1)) / W) * 100;
  const yPx = (v) => H - pad - (v / max) * (H - pad * 2);

  const total = Number(ts?.total) || 0;
  const prev = Number(ts?.prev_total) || 0;
  const change = prev > 0 ? ((total - prev) / prev) * 100 : null;
  const up = change === null ? true : change >= 0;
  const color = change === null ? "#2f63f6" : up ? "#16a34a" : "#dc2626";
  const avg = totals.length ? total / totals.length : 0;
  const billsTotal = valid.reduce((a, x) => a + (x.p.bills || 0), 0);
  const high = valid.length ? valid.reduce((a, b) => (b.p.total > a.p.total ? b : a)) : null;
  const low = valid.length ? valid.reduce((a, b) => (b.p.total < a.p.total ? b : a)) : null;

  const line = valid
    .map((x, k) => `${k ? "L" : "M"}${(xPct(x.i) / 100) * W} ${yPx(x.p.total)}`)
    .join(" ");
  const lastValid = valid.length ? valid[valid.length - 1].i : 0;
  const firstValid = valid.length ? valid[0].i : 0;
  const area = valid.length
    ? `${line} L${(xPct(lastValid) / 100) * W} ${H - pad} L${(xPct(firstValid) / 100) * W} ${H - pad} Z`
    : "";

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const rel = (clientX - rect.left) / rect.width;
    const raw = ((rel * W - pad) / (W - pad * 2)) * (n - 1);
    setHover(Math.max(0, Math.min(lastValid, Math.round(raw))));
  };

  const hp = hover !== null && points[hover]?.total !== null ? points[hover] : null;

  const pillBase = {
    height: 30,
    padding: "0 12px",
    border: 0,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <Card
      title="Sales Trend"
      right={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            role="tablist"
            style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3 }}
          >
            {SERIES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="tab"
                aria-selected={series === r.value}
                onClick={() => setSeries(r.value)}
                style={{
                  ...pillBase,
                  background: series === r.value ? "#fff" : "transparent",
                  color: series === r.value ? "#2f63f6" : "#6b7280",
                  boxShadow: series === r.value ? "0 1px 2px rgba(15,23,42,.12)" : "none",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={downloading}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              <svg viewBox="0 0 24 24" {...iconProps} width={16} height={16}>
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              {downloading ? "Preparing..." : "Download"}
            </button>

            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  zIndex: 20,
                  width: 300,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(15, 23, 42, .12)",
                  padding: 6,
                }}
              >
                <div style={{ padding: "6px 10px", fontSize: 13, color: "#6b7280" }}>
                  {fromDate && toDate
                    ? "Sales report · Custom dates"
                    : `Sales report · ${SERIES_TITLE[series]}`}
                </div>

                <div style={{ display: "flex", gap: 8, padding: "4px 10px 8px" }}>
                  <label style={{ flex: 1, fontSize: 12, color: "#6b7280" }}>
                    From
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || todayStr}
                      onChange={(e) => setFromDate(e.target.value)}
                      style={dateInputStyle}
                    />
                  </label>
                  <label style={{ flex: 1, fontSize: 12, color: "#6b7280" }}>
                    To
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      max={todayStr}
                      onChange={(e) => setToDate(e.target.value)}
                      style={dateInputStyle}
                    />
                  </label>
                </div>

                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#2f63f6",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "0 10px 6px",
                      cursor: "pointer",
                    }}
                  >
                    Clear dates (use {SERIES_TITLE[series]})
                  </button>
                )}

                {DOWNLOAD_OPTIONS.map(([kind, title, sub]) => (
                  <button
                    key={kind}
                    type="button"
                    role="menuitem"
                    className="dash-menu-item"
                    onClick={() => download(kind)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      border: 0,
                      borderRadius: 8,
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#111827" }}>
                      {title}
                    </span>
                    <span style={{ display: "block", fontSize: 13, color: "#6b7280" }}>{sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ height: 300, borderRadius: 12, background: "#f1f5f9" }} />
      ) : !ts || valid.length === 0 ? (
        <Empty>No data yet.</Empty>
      ) : (
        <>
          {/* headline number, like a stock quote */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(hp ? hp.total : total)}
            </div>
            <div style={{ fontSize: 14, marginTop: 2, color: "#6b7280" }}>
              {hp ? (
                pointLabel(series, hp, true)
              ) : change === null ? (
                "No earlier data to compare"
              ) : (
                <>
                  <span style={{ fontWeight: 700, color }}>
                    {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                  </span>{" "}
                  {VS_LABEL[series]}
                </>
              )}
            </div>
          </div>

          <div style={{ position: "relative", paddingLeft: 56 }}>
            {[1, 0.75, 0.5, 0.25, 0].map((f) => (
              <div
                key={f}
                style={{
                  position: "absolute",
                  left: 0,
                  top: (yPx(max * f) / H) * AREA,
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: "#9ca3af",
                }}
              >
                {compact(max * f)}
              </div>
            ))}

            <div
              style={{ position: "relative", height: AREA, cursor: "crosshair" }}
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
              onTouchStart={onMove}
              onTouchMove={onMove}
              onTouchEnd={() => setHover(null)}
            >
              <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%", display: "block" }}
                role="img"
                aria-label="Sales trend chart"
              >
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                  <line
                    key={f}
                    x1="0"
                    x2={W}
                    y1={yPx(max * f)}
                    y2={yPx(max * f)}
                    stroke="#eef2f7"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                <path d={area} fill="url(#trendFill)" />

                {avg > 0 && (
                  <line
                    x1="0"
                    x2={W}
                    y1={yPx(avg)}
                    y2={yPx(avg)}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                <path
                  d={line}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {hp && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      left: `${xPct(hover)}%`,
                      top: 0,
                      bottom: 0,
                      borderLeft: "1px dashed #cbd5e1",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: `${xPct(hover)}%`,
                      top: `${(yPx(hp.total) / H) * 100}%`,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: color,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px " + color,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      left: `${Math.min(Math.max(xPct(hover), 18), 82)}%`,
                      transform: "translateX(-50%)",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "8px 12px",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      zIndex: 5,
                      boxShadow: "0 4px 14px rgba(15, 23, 42, .10)",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {pointLabel(series, hp, true)}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                      {fmt(hp.total)}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{billsText(hp.bills)}</div>
                  </div>
                </>
              )}
            </div>

            {/* x axis */}
            <div style={{ position: "relative", height: 24, marginTop: 6 }}>
              {tickIndexes(series, n).map((i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${xPct(i)}%`,
                    transform:
                      i === 0 ? "none" : i === n - 1 ? "translateX(-100%)" : "translateX(-50%)",
                    fontSize: 13,
                    color: "#9ca3af",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pointLabel(series, points[i], false)}
                </span>
              ))}
            </div>
          </div>

          {/* quick stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {[
              ["High", fmt(high?.p.total), high ? pointLabel(series, high.p, false) : ""],
              ["Low", fmt(low?.p.total), low ? pointLabel(series, low.p, false) : ""],
              ["Average", fmt(avg), series === "1d" ? "per hour" : series === "1y" ? "per month" : "per day"],
              ["Bills", billsTotal, "in this period"],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{value}</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>{sub}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function BranchSelect({ value, onChange, branches }) {
  return (
    <select
      className="dash-select dash-select-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Branch"
    >
      <option value="">All Branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}

// Each card follows the global branch, but can be changed on its own
function useSectionBranch(globalBranch) {
  const g = globalBranch ? String(globalBranch) : "";
  const [branch, setBranch] = useState(g);
  useEffect(() => {
    setBranch(g);
  }, [g]);
  return [branch, setBranch];
}

function BusiestTimesCard({ token, branches, globalBranch, showSelect }) {
  const [branch, setBranch] = useSectionBranch(globalBranch);
  const { data, loading } = useCachedApi(
    `${BASE_URL}/api/dashboard/insights`,
    { branch_id: branch || 0, only: "peak" },
    { token }
  );
  const peak = data?.peak;
  const top = Math.max(...(peak?.hours || []).map((h) => h.bills), 1);

  return (
    <Card
      title="Busiest Times"
      hint="Based on bills from the last 30 days"
      right={
        showSelect ? (
          <BranchSelect value={branch} onChange={setBranch} branches={branches} />
        ) : null
      }
    >
      {loading ? (
        <Empty>Loading...</Empty>
      ) : !peak || peak.hours.length === 0 ? (
        <Empty>No data yet.</Empty>
      ) : (
        <>
          {peak.hours.map((h) => (
            <div
              key={h.hour}
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                {hourLabel(h.hour)}
              </span>
              <span
                style={{ height: 8, borderRadius: 6, background: "#e5e7eb", overflow: "hidden" }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${(h.bills / top) * 100}%`,
                    background: "#2f63f6",
                    borderRadius: 6,
                  }}
                />
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                {billsText(h.bills)}
              </span>
            </div>
          ))}
          {peak.day && (
            <Row left={`Busiest day: ${peak.day.name}`} right={billsText(peak.day.bills)} />
          )}
        </>
      )}
    </Card>
  );
}

function TopCustomersCard({ token, branches, globalBranch, showSelect }) {
  const [branch, setBranch] = useSectionBranch(globalBranch);
  const { data, loading } = useCachedApi(
    `${BASE_URL}/api/dashboard/insights`,
    { branch_id: branch || 0, only: "customers" },
    { token }
  );
  const list = data?.customers || [];

  return (
    <Card
      title="Top Customers"
      hint="Highest spenders in the last 30 days"
      right={
        showSelect ? (
          <BranchSelect value={branch} onChange={setBranch} branches={branches} />
        ) : null
      }
    >
      {loading ? (
        <Empty>Loading...</Empty>
      ) : list.length === 0 ? (
        <Empty>No data yet.</Empty>
      ) : (
        list.map((c) => (
          <Row key={c.name} left={c.name} sub={billsText(c.bills)} right={fmt(c.total)} />
        ))
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const Home = () => {
  const navigate = useNavigate();
  const appData = useAppData();
  const { dashboard, loadDashboard } = appData;

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const role = user_data?.user?.role;
  const token =
    user_data?.token || user_data?.access_token || user_data?.user?.token;

  const canSales = hasFeature("reports_sales");
  const canPurchase = hasFeature("reports_purchase");
  const canFinancial = hasFeature("reports_financial");
  const canStock = hasFeature("stock_alerts");
  const canBills = hasFeature("sales_bills");
  const canCustomers = hasFeature("customers");
  const canBranches = hasFeature("branch_management");

  const isBackOffice = role === "admin" || role === "manager";
  const nothingEnabled =
    isBackOffice &&
    !(canSales || canPurchase || canFinancial || canStock || canBills || canCustomers);

  const managerBranchId =
    role === "manager"
      ? user_data?.branch_id ??
        user_data?.user?.branch_id ??
        user_data?.user?.branch_ids?.[0] ??
        user_data?.branch_ids?.[0] ??
        null
      : null;

  const adminStoreId = role === "admin" ? user_data?.user?.store_id ?? null : null;

  const branches = appData?.branches || [];
  const [range, setRange] = useState("today");
  const [pickedBranch, setPickedBranch] = useState("");
  const branchId = role === "manager" ? managerBranchId : pickedBranch || null;
  const showBranchPicker = role === "admin" && canBranches && branches.length > 1;

  const [loading, setLoading] = useState(true);

  // Shared app cache (the other widgets read from it, so they do not refetch)
  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      if (!dashboard) setLoading(true);

      try {
        await loadDashboard();
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [role, loadDashboard, dashboard]);

  useEffect(() => {
    if (role === "admin" && canBranches) {
      appData?.loadBranches?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Cash, bank, dues (cached: no refetch on every visit)
  const { data: money } = useCachedApi(
    `${BASE_URL}/api/dashboard/money-summary`,
    { branch_id: branchId || 0 },
    { token, enabled: isBackOffice }
  );

  // Insights for the selected range and branch (cached)
  const { data: ins, loading: insLoading } = useCachedApi(
    `${BASE_URL}/api/dashboard/insights`,
    { range, branch_id: branchId || 0, only: MAIN_SECTIONS },
    { token, enabled: isBackOffice }
  );

  const widgetBranch = branchId || "ALL";
  const wait = insLoading && !ins;

  /* ---------- "Aaj kya karna hai" ---------- */
  const actions = useMemo(() => {
    const list = [];
    const sr = ins?.stock_risk;

    if (canStock && sr) {
      if (sr.out > 0) {
        list.push({
          tone: "red",
          text: (<><b>{sr.out}</b> {sr.out === 1 ? "item is" : "items are"} out of stock</>),
          cta: "Restock",
          to: ROUTES.newPurchase,
        });
      }
      if (sr.low > 0) {
        list.push({
          tone: "amber",
          text: (<><b>{sr.low}</b> {sr.low === 1 ? "item is" : "items are"} running low ({sr.limit} or fewer left)</>),
          cta: "Restock",
          to: ROUTES.newPurchase,
        });
      }
      (sr.best_sellers_low || []).slice(0, 2).forEach((b) =>
        list.push({
          tone: "red",
          text: (
            <>
              <b>{b.name}</b> is selling fast ({b.sold} sold) but only {b.left} left in stock
            </>
          ),
          cta: "Reorder",
          to: ROUTES.newPurchase,
        })
      );
    }

    if (money) {
      if (canCustomers && Number(money.customer_dues) > 0) {
        const n = ins?.customers_due_count;
        list.push({
          tone: "amber",
          text: (
            <>
              <b>{fmt(money.customer_dues)}</b> to collect from customers
              {n ? ` (${n} customers)` : ""}
            </>
          ),
          cta: "View dues",
          to: ROUTES.dues,
        });
      }
      if (canPurchase && Number(money.supplier_dues) > 0) {
        list.push({
          tone: "amber",
          text: (<><b>{fmt(money.supplier_dues)}</b> to pay suppliers</>),
          cta: "Purchases",
          to: ROUTES.newPurchase,
        });
      }
      if (canFinancial && Number(money.cash_in_hand) < 0) {
        list.push({
          tone: "red",
          text: <b>Cash in hand is negative. Review your entries.</b>,
          cta: "Expenses",
          to: ROUTES.addExpense,
        });
      }
    }

    if (canStock && ins?.expiry) {
      if (ins.expiry.expired > 0) {
        list.push({
          tone: "red",
          text: (<><b>{ins.expiry.expired}</b> {ins.expiry.expired === 1 ? "batch has" : "batches have"} expired</>),
          cta: "Products",
          to: ROUTES.products,
        });
      }
      if (ins.expiry.soon > 0) {
        list.push({
          tone: "amber",
          text: (<><b>{ins.expiry.soon}</b> {ins.expiry.soon === 1 ? "batch expires" : "batches expire"} within 30 days</>),
          cta: "Products",
          to: ROUTES.products,
        });
      }
    }

    if (canStock && ins?.dead_stock?.count > 0) {
      list.push({
        tone: "blue",
        text: (
          <>
            <b>{ins.dead_stock.count}</b> items have not sold in 30 days, {fmt(ins.dead_stock.value)} of
            stock is tied up
          </>
        ),
        cta: "Products",
        to: ROUTES.products,
      });
    }

    return list;
  }, [ins, money, canStock, canCustomers, canPurchase, canFinancial]);

  const sales = ins?.sales;
  const profit = ins?.profit;
  const exp = ins?.expenses;
  const pay = ins?.payments;
  const payTotal = (pay?.cash || 0) + (pay?.online || 0);
  const available = money ? Number(money.cash_in_hand) + Number(money.bank_balance) : 0;
  const rangeLabel = RANGES.find((r) => r.value === range)?.label;
  const cardProps = {
    token,
    branches,
    globalBranch: branchId,
    showSelect: showBranchPicker,
  };

  return (
    <Layout>
      <style>{selectCss}</style>
      <div className="main-content-inner">
        <div className="main-content-wrap">

          {role === "superadmin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                to="/store"
                icon={<IconStore />}
                label="Total Store"
                value={(dashboard?.stores || []).length}
                color="#22C55E"
                loading={loading}
              />
            </div>
          )}

          {nothingEnabled && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Empty Dashboard</h3>
              <p className="text-gray-500">
                There is no dashboard features enable for your account. You can use available
                menus from the left side menu or kindly contact your Admin.
              </p>
            </div>
          )}

          {isBackOffice && !nothingEnabled && (
            <>
              {/* Top bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>
                    Dashboard
                  </h3>
                  {role === "admin" && pickedBranch && (
                    <button
                      type="button"
                      onClick={() => setPickedBranch("")}
                      title="Show all branches"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 999,
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {branches.find((b) => String(b.id) === String(pickedBranch))?.name || "Branch"}
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {showBranchPicker && (
                    <select
                      className="dash-select"
                      value={pickedBranch}
                      onChange={(e) => setPickedBranch(e.target.value)}
                      aria-label="Branch"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div
                    role="tablist"
                    style={{
                      display: "inline-flex",
                      background: "#e8edf5",
                      borderRadius: 10,
                      padding: 3,
                    }}
                  >
                    {RANGES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        role="tab"
                        aria-selected={range === r.value}
                        onClick={() => setRange(r.value)}
                        style={{
                          height: 34,
                          padding: "0 14px",
                          border: 0,
                          borderRadius: 8,
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: range === r.value ? "#fff" : "transparent",
                          color: range === r.value ? "#2f63f6" : "#4b5563",
                          boxShadow: range === r.value ? "0 1px 2px rgba(0,0,0,.1)" : "none",
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={invalidateDashboardCache}
                    aria-label="Refresh dashboard"
                    title="Refresh"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#4b5563",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <svg viewBox="0 0 24 24" {...iconProps}>
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.ai)}
                    aria-label="Ask AI"
                    title="Ask AI"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid #ddd6fe",
                      background: "#f5f3ff",
                      color: "#7c3aed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <IconSpark />
                  </button>
                </div>
              </div>

              {/* 1. Paisa */}
              <div style={{ ...autoGrid, marginBottom: 20 }}>
                {canSales && (
                  <Kpi
                    label={
                      range === "today"
                        ? "Today's Sales"
                        : range === "week"
                        ? "This Week's Sales"
                        : "This Month's Sales"
                    }
                    value={wait || !sales ? "-" : fmt(sales.total)}
                    accent="#2377FC"
                    sub={
                      sales ? (
                        <Delta cur={sales.total} prev={sales.prev_total} label={PREV_LABEL[range]} />
                      ) : (
                        " "
                      )
                    }
                  />
                )}

                {canFinancial && profit && (
                  <Kpi
                    label="Profit"
                    value={fmt(profit.amount)}
                    accent="#22C55E"
                    sub={
                      <>
                        Margin <b style={{ color: "#111827" }}>{profit.margin_pct}%</b> · After
                        expenses <b style={{ color: "#111827" }}>{fmt(profit.after_expenses)}</b>
                      </>
                    }
                  />
                )}

                {canFinancial && (
                  <Kpi
                    label="Available Funds"
                    value={money ? fmt(available) : "-"}
                    accent="#0EA5E9"
                    sub={
                      money ? (
                        <>
                          Cash <b style={{ color: "#111827" }}>{fmt(money.cash_in_hand)}</b> · Bank{" "}
                          <b style={{ color: "#111827" }}>{fmt(money.bank_balance)}</b>
                        </>
                      ) : (
                        " "
                      )
                    }
                  />
                )}

                {(canCustomers || canPurchase) && (
                  <Kpi
                    label="To Collect"
                    value={money ? fmt(money.customer_dues) : "-"}
                    accent="#F59E0B"
                    sub={
                      money ? (
                        <>
                          To pay suppliers{" "}
                          <b style={{ color: "#111827" }}>{fmt(money.supplier_dues)}</b>
                        </>
                      ) : (
                        " "
                      )
                    }
                  />
                )}
              </div>

              {/* mini stats */}
              <div style={{ ...autoGrid, marginBottom: 32 }}>
                {canFinancial && exp && (
                  <Mini
                    label="Expenses"
                    value={fmt(exp.total)}
                    sub={`Cash ${fmt(exp.cash)} · Bank ${fmt(exp.bank)}`}
                  />
                )}
                {canSales && sales && (
                  <Mini label="Bills" value={sales.bills} sub={`Average bill ${fmt(sales.avg_bill)}`} />
                )}
                {canSales && pay && payTotal > 0 && (
                  <Mini
                    label="Payment split"
                    value={`${Math.round((pay.cash / payTotal) * 100)}% cash`}
                    sub={`UPI/Bank ${Math.round((pay.online / payTotal) * 100)}% · ${fmt(pay.online)}`}
                  />
                )}
                {canStock && ins?.expiry && (ins.expiry.soon > 0 || ins.expiry.expired > 0) && (
                  <Mini
                    label="Expiring Soon"
                    value={ins.expiry.soon}
                    sub={`Expiring in 30 days · ${ins.expiry.expired} expired`}
                  />
                )}
              </div>

              {/* 2. Kya karna hai */}
              <div className="mb-8">
                <Card title="Needs Attention" hint="Things that need action right now">
                  {!money && !ins ? (
                    <Empty>Checking your numbers...</Empty>
                  ) : actions.length === 0 ? (
                    <Empty>Everything looks good. Nothing urgent right now.</Empty>
                  ) : (
                    actions.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: i === actions.length - 1 ? 0 : "1px solid #f1f5f9",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: TONE[a.tone],
                            flex: "none",
                          }}
                        />
                        <div style={{ flex: 1, fontSize: 15, color: "#374151" }}>{a.text}</div>
                        <Link
                          to={a.to}
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#2f63f6",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                          }}
                        >
                          {a.cta} →
                        </Link>
                      </div>
                    ))
                  )}
                </Card>
              </div>

              {/* 3. Sales kaisi chal rahi hai */}
              {canSales && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2">
                    <SalesTrendCard token={token} branchId={branchId} />
                  </div>

                  <BusiestTimesCard {...cardProps} />
                </div>
              )}

              {/* 4. Products */}
              {canSales && (
                <div className="mb-6">
                  <TopLowSellingProducts
                    key={`tl-${widgetBranch}`}
                    role={role}
                    user={user_data}
                    filters={{ branch_id: widgetBranch }}
                    storeId={adminStoreId}
                  />
                </div>
              )}

              {/* 5. Insight cards (masonry, so there are no empty gaps between cards) */}
              <div className="dash-grid">
                {canFinancial && (
                  <div>
                    <ProfitLossWidget
                      key={`pl-${widgetBranch}`}
                      role={role}
                      user={user_data}
                      filters={{ branch_id: widgetBranch }}
                    />
                  </div>
                )}

                {canBills && (
                  <div>
                    <RecentSalesFeed
                      key={`rs-${widgetBranch}`}
                      role={role}
                      user={user_data}
                      filters={{ branch_id: widgetBranch }}
                      storeId={adminStoreId}
                    />
                  </div>
                )}

                {canCustomers && (
                  <div>
                    <CustomerDuesWidget
                      key={`cd-${widgetBranch}`}
                      role={role}
                      user={user_data}
                      filters={{ branch_id: widgetBranch }}
                      storeId={adminStoreId}
                    />
                  </div>
                )}

                {canCustomers && (
                  <div>
                    <TopCustomersCard {...cardProps} />
                  </div>
                )}

                {canSales && ins?.top_profit && ins.top_profit.length > 0 && (
                  <div>
                    <Card title="Most Profitable Products" hint="Last 30 days (approximate)">
                      {ins.top_profit.map((p) => (
                        <Row
                          key={p.name}
                          left={p.name}
                          sub={`${p.qty} sold`}
                          right={fmt(p.profit)}
                          rightColor="#16a34a"
                        />
                      ))}
                    </Card>
                  </div>
                )}

                {canStock && ins?.dead_stock && ins.dead_stock.count > 0 && (
                  <div>
                    <Card
                      title="Dead Stock"
                      hint={`${ins.dead_stock.count} items have not sold in 30 days · ${fmt(
                        ins.dead_stock.value
                      )} tied up`}
                    >
                      {ins.dead_stock.items.map((d) => (
                        <Row
                          key={d.name}
                          left={d.name}
                          sub={`${d.qty} in stock`}
                          right={fmt(d.value)}
                          rightColor="#dc2626"
                        />
                      ))}
                    </Card>
                  </div>
                )}

                {role === "admin" && ins?.branches && ins.branches.length > 1 && (
                  <div>
                    <Card
                      title="Sales by Branch"
                      hint={`${rangeLabel} · Click a branch to filter the whole dashboard`}
                    >
                      {ins.branches.map((b) => {
                        const on = String(b.id) === String(pickedBranch);
                        return (
                          <button
                            key={b.id ?? b.name}
                            type="button"
                            onClick={() => setPickedBranch(on ? "" : String(b.id))}
                            aria-pressed={on}
                            style={{
                              display: "flex",
                              width: "100%",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              padding: "10px 12px",
                              border: 0,
                              borderBottom: "1px solid #f1f5f9",
                              borderRadius: 10,
                              background: on ? "#eff6ff" : "transparent",
                              font: "inherit",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            <span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 15,
                                  fontWeight: 600,
                                  color: on ? "#2f63f6" : "#111827",
                                }}
                              >
                                {b.name}
                              </span>
                              <span style={{ display: "block", fontSize: 14, color: "#6b7280" }}>
                                {billsText(b.bills)}
                              </span>
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                              {fmt(b.total)}
                            </span>
                          </button>
                        );
                      })}
                    </Card>
                  </div>
                )}
              </div>

              {/* Low stock (detail table) */}
              {canStock && (
                <div className="mb-8">
                  <LowStockAlert
                    key={`ls-${widgetBranch}`}
                    role={role}
                    user={user_data}
                    filters={{ branch_id: widgetBranch }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Home;