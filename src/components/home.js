import React, { useEffect, useState } from "react";
import Layout from "./layout";
import axios from "axios";
import ProfitLossWidget from "./ProfitLossWidget";
import TopSellingProducts from "./topSellingProducts";
import LowStockAlert from "./lowStockAlert";
import StatCard from "./StatCard";
import PaymentBreakdown from "./PaymentBreakdown";
import { hasFeature } from "../utils/hasFeature";

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
const IconBox = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
);
const IconInbox = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const IconUserAlert = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v4M19 16h.01" />
  </svg>
);
const IconBranch = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Home = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // superadmin
  const [stores, setStores] = useState([]);
  // manager
  const [products, setProducts] = useState([]);
  const [purchaseBills, setPurchaseBills] = useState([]);
  const [saleBills, setSaleBills] = useState([]);
  const [todayReport, setTodayReport] = useState(null);
  // admin
  const [branchs, setBranchs] = useState([]);
  const [staffs, setStaffs] = useState([]);
  // shared (manager + admin)
  const [customerDues, setCustomerDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const role = user_data?.user?.role;

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${user_data?.token}`,
  };

  const get = (path, params) =>
    axios.get(`${BASE_URL}${path}`, { headers: authHeaders, params });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (role === "superadmin") {
          const res = await get("/api/stores");
          setStores(res.data.data);
        }

        if (role === "manager") {
          const calls = [];
          const keys = [];

          if (hasFeature("products")) {
            calls.push(get("/api/products"));
            keys.push("products");
          }
          if (hasFeature("purchase_bills")) {
            calls.push(get("/api/purchase-bill"));
            keys.push("purchaseBills");
          }
          calls.push(get("/api/sales-bills"));
          keys.push("saleBills");
          calls.push(get("/api/customer/due"));
          keys.push("customerDues");

          const results = await Promise.all(calls);
          results.forEach((res, i) => {
            if (keys[i] === "products") setProducts(res.data.products);
            if (keys[i] === "purchaseBills") setPurchaseBills(res.data.data);
            if (keys[i] === "saleBills") setSaleBills(res.data.data);
            if (keys[i] === "customerDues") setCustomerDues(res.data.data);
          });

          if (hasFeature("reports_sales")) {
            try {
              const tr = await get("/api/reports/sales-report", {
                date_range: "today",
                bill_status: "all",
              });
              setTodayReport(tr.data);
            } catch (e) {
              console.warn("Could not load today's report:", e.message);
            }
          }
        }

        if (role === "admin") {
          const calls = [];
          const keys = [];

          if (hasFeature("branch_management")) {
            calls.push(get("/api/branches"));
            keys.push("branches");
          }
          if (hasFeature("staff_management")) {
            calls.push(get("/api/staff"));
            keys.push("staff");
          }
          calls.push(get("/api/customer/due"));
          keys.push("customerDues");

          const results = await Promise.all(calls);
          results.forEach((res, i) => {
            if (keys[i] === "branches") setBranchs(res.data.data);
            if (keys[i] === "staff") setStaffs(res.data.data);
            if (keys[i] === "customerDues") setCustomerDues(res.data.data);
          });
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role) load();
  }, [role]);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {role === "superadmin" && (
              <StatCard
                to="/store"
                icon={<IconStore />}
                label="Total Store"
                value={stores.length}
                color="#22C55E"
                loading={loading}
              />
            )}

            {role === "manager" && (
              <>
                {hasFeature("products") && (
                  <StatCard
                    to="/product"
                    icon={<IconBox />}
                    label="Total Products"
                    value={products.length}
                    color="#2377FC"
                    loading={loading}
                  />
                )}
                {hasFeature("purchase_bills") && (
                  <StatCard
                    to="/purchase-bill"
                    icon={<IconInbox />}
                    label="Total Purchase Bills"
                    value={purchaseBills.length}
                    color="#FC2359"
                    loading={loading}
                  />
                )}
                <StatCard
                  to="/sale-bill"
                  icon={<IconCart />}
                  label="Total Sale Bills"
                  value={saleBills.length}
                  color="#23C55E"
                  loading={loading}
                />
                <StatCard
                  to="/customer-dues"
                  icon={<IconUserAlert />}
                  label="Total Customer Dues"
                  value={customerDues.length}
                  color="#F59E0B"
                  loading={loading}
                />
              </>
            )}

            {role === "admin" && (
              <>
                {hasFeature("branch_management") && (
                  <StatCard
                    to="/branch"
                    icon={<IconBranch />}
                    label="Total Branches"
                    value={branchs.length}
                    color="#FF5200"
                    loading={loading}
                  />
                )}
                {hasFeature("staff_management") && (
                  <StatCard
                    to="/staff"
                    icon={<IconUsers />}
                    label="Total Staff"
                    value={staffs.length}
                    color="#8B5CF6"
                    loading={loading}
                  />
                )}
                <StatCard
                  to="/customer-dues"
                  icon={<IconUserAlert />}
                  label="Total Customer Dues"
                  value={customerDues.length}
                  color="#22C55E"
                  loading={loading}
                />
              </>
            )}
          </div>

          {role === "manager" && hasFeature("reports_sales") && (
            <PaymentBreakdown
              report={todayReport}
              loading={loading || !todayReport}
            />
          )}

          {["admin", "manager"].includes(role) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex flex-col gap-6">
                {hasFeature("reports_financial") && (
                  <ProfitLossWidget role={role} user={user_data} />
                )}
                {hasFeature("stock_alerts") && (
                  <LowStockAlert
                    role={role}
                    user={user_data}
                    filters={{ branch_id: "ALL" }}
                  />
                )}
              </div>
              <div className="flex flex-col gap-6 selling-product">
                {hasFeature("reports_sales") && (
                  <TopSellingProducts
                    role={role}
                    user={user_data}
                    filters={{ branch_id: "ALL" }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Home;
