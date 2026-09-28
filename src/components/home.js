import React, { useEffect, useState } from "react";
import Layout from "./layout";
import axios from "axios";
import ProfitLossWidget from "./ProfitLossWidget";
import LowStockAlert from "./lowStockAlert";
import StatCard from "./StatCard";
import PaymentBreakdown from "./PaymentBreakdown";
import MonthlySalesChart from "./MonthlySalesChart";
import TopLowSellingProducts from "./TopLowSellingProducts";
import CustomerDuesWidget from "./CustomerDuesWidget";
import RecentSalesFeed from "./RecentSalesFeed";
import TaxAndActionsWidget from "./TaxAndActionsWidget";

/* ---- tiny inline icons (no extra icon-library dependency) ---- */
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
const IconCart = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const IconInbox = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
const IconAlertCircle = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconWallet = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const Home = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const role = user_data?.user?.role;
  const canSales = hasFeature("reports_sales");
  const canPurchase = hasFeature("reports_purchase");
  const canFinancial = hasFeature("reports_financial");
  const canStock = hasFeature("stock_alerts");
  const canBills = hasFeature("sales_bills");
  const canCustomers = hasFeature("customers");

  const isBackOffice = role === "admin" || role === "manager";
  const nothingEnabled =
    isBackOffice &&
    !(
      canSales ||
      canPurchase ||
      canFinancial ||
      canStock ||
      canBills ||
      canCustomers
    );

  // superadmin
  const [stores, setStores] = useState([]);
  // admin + manager
  const [todaySales, setTodaySales] = useState(null);
  const [todayPurchase, setTodayPurchase] = useState(null);
  const [monthProducts, setMonthProducts] = useState([]);
  const [customerDues, setCustomerDues] = useState([]);
  const [saleBills, setSaleBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${user_data?.token}`,
  };
  const get = (path, params) =>
    axios.get(`${BASE_URL}${path}`, { headers: authHeaders, params });

  useEffect(() => {
    if (!role) return;

    const load = async () => {
      setLoading(true);
      try {
        // ---------- SUPERADMIN ----------
        if (role === "superadmin") {
          const res = await get("/api/stores");
          setStores(res.data.data || []);
          return;
        }

        const jobs = [];

        if (canSales) {
          jobs.push([
            "salesToday",
            get("/api/reports/sales-report", {
              date_range: "today",
              bill_status: "all",
            }),
          ]);
          jobs.push([
            "salesMonth",
            get("/api/reports/sales-report", {
              date_range: "this_month",
              bill_status: "all",
            }),
          ]);
        }
        if (canPurchase) {
          jobs.push([
            "purchaseToday",
            get("/api/reports/purchase-report", { date_range: "today" }),
          ]);
        }
        if (canCustomers) {
          jobs.push(["dues", get("/api/customer/due")]);
        }
        if (canBills) {
          jobs.push(["bills", get("/api/sales-bills")]);
        }

        const results = await Promise.allSettled(jobs.map(([, p]) => p));

        results.forEach((r, i) => {
          const key = jobs[i][0];
          if (r.status !== "fulfilled") {
            console.warn(
              `Dashboard: "${key}" load nahi hua`,
              r.reason?.message,
            );
            return;
          }
          const data = r.value.data;

          if (key === "salesToday") setTodaySales(data);
          if (key === "salesMonth")
            setMonthProducts(data?.products?.rows || []);
          if (key === "purchaseToday") setTodayPurchase(data);
          if (key === "dues") setCustomerDues(data?.data || []);
          if (key === "bills") setSaleBills(data?.data || []);
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role]);

  const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
  const sk = todaySales?.kpis;
  const pk = todayPurchase?.kpis;

  const paymentRows = todaySales?.payment_methods?.rows || [];
  const topMethod = [...paymentRows].sort(
    (a, b) => (b.total_collected || 0) - (a.total_collected || 0),
  )[0];

  // bottom section — kaunse columns dikhane hain
  const showLeftCol = canFinancial || canStock;
  const showRightCol = canBills || canCustomers || canSales;

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* ---------------- SUPERADMIN ---------------- */}
          {role === "superadmin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                to="/store"
                icon={<IconStore />}
                label="Total Store"
                value={stores.length}
                color="#22C55E"
                loading={loading}
              />
            </div>
          )}
          <div className="flex flex-col gap-6">
            <RecentSalesFeed bills={saleBills} loading={loading} />
            <CustomerDuesWidget dues={customerDues} loading={loading} />
            <TaxAndActionsWidget
              taxBreakdown={sk?.tax_breakdown}
              loading={loading}
            />
          </div>

          {role === "manager" && hasFeature("reports_sales") && (
            <PaymentBreakdown
              report={todayReport}
              loading={loading || !todayReport}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Home;
