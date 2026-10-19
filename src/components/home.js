import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
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
  .dash-masonry { column-count: 2; column-gap: 24px; margin-bottom: 8px; }
  .dash-masonry > * { display: inline-block; width: 100%; break-inside: avoid; -webkit-column-break-inside: avoid; margin-bottom: 24px; }
  @media (max-width: 1024px) { .dash-masonry { column-count: 1; } }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

const shortDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

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

function TrendChart({ points }) {
  if (!points?.length) return <Empty>No data yet.</Empty>;

  const W = 600;
  const H = 160;
  const pad = 6;
  const max = Math.max(...points.map((p) => p.total), 1);
  const n = points.length;
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(n - 1, 1);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.total)}`).join(" ");
  const area = `${line} L${x(n - 1)} ${H - pad} L${x(0)} ${H - pad} Z`;
  const best = points.reduce((a, b) => (b.total > a.total ? b : a), points[0]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 180, display: "block" }}
        role="img"
        aria-label="Sales trend"
      >
        <path d={area} fill="rgba(47, 99, 246, .12)" />
        <path
          d={line}
          fill="none"
          stroke="#2f63f6"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 6,
          fontSize: 14,
          color: "#6b7280",
          marginTop: 6,
        }}
      >
        <span>{shortDate(points[0].d)}</span>
        <span>
          Best day: <b style={{ color: "#111827" }}>{shortDate(best.d)}</b> ·{" "}
          {fmt(best.total)}
        </span>
        <span>{shortDate(points[n - 1].d)}</span>
      </div>
    </div>
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
  const [money, setMoney] = useState(null);
  const [ins, setIns] = useState(null);
  const [insLoading, setInsLoading] = useState(true);

  // superadmin: store list
  useEffect(() => {
    if (role !== "superadmin") {
      setLoading(false);
      return;
    }
    loadDashboard()
      .catch((err) => console.error("Dashboard load error:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (role === "admin" && canBranches) {
      appData?.loadBranches?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Cash, bank, dues
  useEffect(() => {
    if (!isBackOffice) return;
    let mounted = true;

    axios
      .get(`${BASE_URL}/api/dashboard/money-summary`, {
        params: { branch_id: branchId || 0 },
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      })
      .then((res) => mounted && setMoney(res.data?.data || null))
      .catch((err) => console.error("Money summary error:", err?.response || err));

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, branchId]);

  // Insights (range + branch)
  useEffect(() => {
    if (!isBackOffice) return;
    let mounted = true;
    setInsLoading(true);

    axios
      .get(`${BASE_URL}/api/dashboard/insights`, {
        params: { range, branch_id: branchId || 0 },
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      })
      .then((res) => mounted && setIns(res.data?.data || null))
      .catch((err) => console.error("Insights error:", err?.response || err))
      .finally(() => mounted && setInsLoading(false));

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, range, branchId]);

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

  const trendPoints = useMemo(() => {
    const all = ins?.trend || [];
    return range === "month" ? all : all.slice(-7);
  }, [ins, range]);

  const sales = ins?.sales;
  const profit = ins?.profit;
  const exp = ins?.expenses;
  const pay = ins?.payments;
  const payTotal = (pay?.cash || 0) + (pay?.online || 0);
  const available = money ? Number(money.cash_in_hand) + Number(money.bank_balance) : 0;
  const rangeLabel = RANGES.find((r) => r.value === range)?.label;

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
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>
                  Dashboard
                </h3>

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
                    <Card
                      title="Sales trend"
                      hint={range === "month" ? "Last 30 days" : "Last 7 days"}
                      right={
                        sales ? (
                          <Delta cur={sales.total} prev={sales.prev_total} label={PREV_LABEL[range]} />
                        ) : null
                      }
                    >
                      <TrendChart points={trendPoints} />
                    </Card>
                  </div>

                  <Card title="Busiest Times" hint="Based on bills from the last 30 days">
                    {!ins?.peak || ins.peak.hours.length === 0 ? (
                      <Empty>No data yet.</Empty>
                    ) : (
                      <>
                        {ins.peak.hours.map((h) => (
                          <Row key={h.hour} left={hourLabel(h.hour)} right={`${billsText(h.bills)}`} />
                        ))}
                        {ins.peak.day && (
                          <Row
                            left={`Busiest day: ${ins.peak.day.name}`}
                            right={`${billsText(ins.peak.day.bills)}`}
                          />
                        )}
                      </>
                    )}
                  </Card>
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
              <div className="dash-masonry">
                {canFinancial && (
                  <div>
                    <ProfitLossWidget role={role} user={user_data} />
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

                {canCustomers && ins?.customers && ins.customers.length > 0 && (
                  <div>
                    <Card title="Top Customers" hint="Highest spenders in the last 30 days">
                      {ins.customers.map((c) => (
                        <Row
                          key={c.name}
                          left={c.name}
                          sub={billsText(c.bills)}
                          right={fmt(c.total)}
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