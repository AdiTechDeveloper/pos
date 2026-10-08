// import React, { useEffect, useState } from "react";
// import Layout from "./layout";
// import axios from "axios";
// import ProfitLossWidget from "./ProfitLossWidget";
// import LowStockAlert from "./lowStockAlert";
// import StatCard from "./StatCard";
// import PaymentBreakdown from "./PaymentBreakdown";
// import MonthlySalesChart from "./MonthlySalesChart";
// import TopLowSellingProducts from "./TopLowSellingProducts";
// import CustomerDuesWidget from "./CustomerDuesWidget";
// import RecentSalesFeed from "./RecentSalesFeed";
// // import TaxAndActionsWidget from "./TaxAndActionsWidget";
// import { hasFeature } from "../utils/hasFeature";

// const iconProps = {
//   width: 18,
//   height: 18,
//   fill: "none",
//   stroke: "currentColor",
//   strokeWidth: 2,
//   strokeLinecap: "round",
//   strokeLinejoin: "round",
// };
// const IconStore = () => (
//   <svg viewBox="0 0 24 24" {...iconProps}>
//     <path d="M3 9l1-5h16l1 5" />
//     <path d="M5 9v10h14V9" />
//     <path d="M9 21v-6h6v6" />
//   </svg>
// );
// const IconCart = () => (
//   <svg viewBox="0 0 24 24" {...iconProps}>
//     <circle cx="9" cy="21" r="1" />
//     <circle cx="20" cy="21" r="1" />
//     <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
//   </svg>
// );
// const IconInbox = () => (
//   <svg viewBox="0 0 24 24" {...iconProps}>
//     <path d="M22 12h-6l-2 3h-4l-2-3H2" />
//     <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
//   </svg>
// );
// const IconAlertCircle = () => (
//   <svg viewBox="0 0 24 24" {...iconProps}>
//     <circle cx="12" cy="12" r="10" />
//     <line x1="12" y1="8" x2="12" y2="12" />
//     <line x1="12" y1="16" x2="12.01" y2="16" />
//   </svg>
// );
// const IconWallet = () => (
//   <svg viewBox="0 0 24 24" {...iconProps}>
//     <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
//     <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
//     <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
//   </svg>
// );

// const Home = () => {
//   const BASE_URL = process.env.REACT_APP_API_BASE_URL;
//   const user_data = JSON.parse(localStorage.getItem("user_detail"));
//   const role = user_data?.user?.role;
//   const canSales = hasFeature("reports_sales");
//   const canPurchase = hasFeature("reports_purchase");
//   const canFinancial = hasFeature("reports_financial");
//   const canStock = hasFeature("stock_alerts");
//   const canBills = hasFeature("sales_bills");
//   const canCustomers = hasFeature("customers");

//   // Manager's own branch - admin sees all branches, manager is scoped to one
//   const managerBranchId =
//     role === "manager"
//       ? user_data?.branch_id ??
//       user_data?.user?.branch_id ??
//       user_data?.user?.branch_ids?.[0] ??
//       user_data?.branch_ids?.[0] ??
//       null
//       : null;

//    // Admin's own store - confirmed field from PurchaseReport.js (user_data.user.store_id)
//   const adminStoreId = role === "admin" ? user_data?.user?.store_id ?? null : null;

//   const isBackOffice = role === "admin" || role === "manager";
//   const nothingEnabled =
//     isBackOffice &&
//     !(
//       canSales ||
//       canPurchase ||
//       canFinancial ||
//       canStock ||
//       canBills ||
//       canCustomers
//     );


//   // superadmin
//   const [stores, setStores] = useState([]);
//   // admin + manager
//   const [todaySales, setTodaySales] = useState(null);
//   const [todayPurchase, setTodayPurchase] = useState(null);
//   const [monthProducts, setMonthProducts] = useState([]);
//   const [customerDues, setCustomerDues] = useState([]);
//   const [saleBills, setSaleBills] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [recentInvoices, setRecentInvoices] = useState([]);

//   const authHeaders = {
//     Accept: "application/json",
//     Authorization: `Bearer ${user_data?.token}`,
//   };
//   const get = (path, params) =>
//     axios.get(`${BASE_URL}${path}`, { headers: authHeaders, params });

//   useEffect(() => {
//     if (!role) return;

//     const load = async () => {
//       setLoading(true);



//       try {
//         // ---------- SUPERADMIN ----------
//         if (role === "superadmin") {
//           const res = await get("/api/stores");
//           setStores(res.data.data || []);
//           return;
//         }

//         // ---------- ADMIN / MANAGER ----------
//         const jobs = [];

//         if (canSales) {
//           jobs.push([
//             "salesToday",
//             get("/api/reports/sales-report", {
//               date_range: "today",
//               bill_status: "all",
//               branch_id: managerBranchId,
//                store_id: adminStoreId,
//             }),
//           ]);
//           jobs.push([
//             "salesMonth",
//             get("/api/reports/sales-report", {
//               date_range: "this_month",
//               bill_status: "all",
//               branch_id: managerBranchId,
//                store_id: adminStoreId,
//             }),
//           ]);
//         }
//         if (canPurchase) {
//           jobs.push([
//             "purchaseToday",
//             get("/api/reports/purchase-report", { date_range: "today" ,  store_id: adminStoreId ,}),

//           ]);
//         }
//         if (canCustomers) {
//           jobs.push(["dues", get("/api/customer/due")]);
//         }
//         if (canBills) {
//           // console.log("BILLS TOKEN EXISTS:", !!user_data?.token);
//           // console.log("BILLS TOKEN LENGTH:", user_data?.token?.length);
//           jobs.push(["bills", get("/api/sales-bills")]);
//         }

//         const results = await Promise.allSettled(jobs.map(([, p]) => p));

//         results.forEach((r, i) => {
//           const key = jobs[i][0];
//           if (r.status !== "fulfilled") {
//             console.warn(
//               `Dashboard: "${key}" load nahi hua`,
//               r.reason?.message,
//             );
//             return;
//           }
//           const data = r.value.data;

//           if (key === "salesToday") setTodaySales(data);
//           if (key === "salesMonth") {
//             setMonthProducts(data?.products?.rows || []);
//             setRecentInvoices(data?.invoices?.rows || []); // has customer names
//           }
//           if (key === "purchaseToday") setTodayPurchase(data);
//           if (key === "dues") setCustomerDues(data?.data || []);
//           if (key === "bills") {
//             // console.log("SALES BILLS FULL RESPONSE:", data);
//             // console.log("SALES BILLS DATA:", data?.data);
//             setSaleBills(data?.data || []);
//           }

//         });
//       } catch (err) {
//         // console.error("Dashboard load error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     load();
//   }, [role]);

//   const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
//   const sk = todaySales?.kpis;
//   const pk = todayPurchase?.kpis;

//   const paymentRows = todaySales?.payment_methods?.rows || [];
//   const topMethod = [...paymentRows].sort(
//     (a, b) => (b.total_collected || 0) - (a.total_collected || 0),
//   )[0];

//   // bottom section — kaunse columns dikhane hain
//   const showLeftCol = canFinancial || canStock;
//   const showRightCol = canBills || canCustomers || canSales;

//   return (
//     <Layout>
//       <div className="main-content-inner">
//         <div className="main-content-wrap">
//           {/* ---------------- SUPERADMIN ---------------- */}
//           {role === "superadmin" && (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
//               <StatCard
//                 to="/store"
//                 icon={<IconStore />}
//                 label="Total Store"
//                 value={stores.length}
//                 color="#22C55E"
//                 loading={loading}
//               />
//             </div>
//           )}

//           {/* ---------------- ADMIN / MANAGER ---------------- */}
//           {nothingEnabled && (
//             <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
//               <h3 className="text-2xl font-bold mb-2">Empty Dashboard</h3>
//               <p className="text-gray-500">
//                 There is no dashboard features enable for your account. You can
//                 use available menus from the left side menu or kindly contact
//                 your Admin.
//               </p>
//             </div>
//           )}

//           {isBackOffice && (canSales || canPurchase) && (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
//               {canSales && (
//                 <StatCard
//                   icon={<IconCart />}
//                   label="Total Sales (Today)"
//                   value={loading || !sk ? "-" : rupee(sk.gross_sales)}
//                   color="#2377FC"
//                   loading={loading}
//                 />
//               )}
//               {canPurchase && (
//                 <StatCard
//                   icon={<IconInbox />}
//                   label="Total Purchase (Today)"
//                   value={loading || !pk ? "-" : rupee(pk.total_purchase_value)}
//                   color="#F59E0B"
//                   loading={loading}
//                 />
//               )}
//               {canSales && (
//                 <StatCard
//                   icon={<IconAlertCircle />}
//                   label="Total Dues (Today)"
//                   value={loading || !sk ? "-" : rupee(sk.total_due)}
//                   color="#FC2359"
//                   loading={loading}
//                 />
//               )}
//               {canSales && (
//                 <StatCard
//                   icon={<IconWallet />}
//                   label="Top Payment Method"
//                   value={
//                     loading || !topMethod
//                       ? "-"
//                       : `${topMethod.method} · ${topMethod.share_pct}%`
//                   }
//                   color="#8B5CF6"
//                   loading={loading}
//                 />
//               )}
//             </div>
//           )}

//           {/* Payment split + Monthly sales chart (dono sales data par based) */}
//           {isBackOffice && canSales && (
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//               <PaymentBreakdown
//                 role={role}
//                 user={user_data}
//                  storeId={adminStoreId}

//               />
//                         <MonthlySalesChart
//                 role={role}
//                 user={user_data}
//                 filters={{ branch_id: managerBranchId || "ALL" }}
//                 storeId={adminStoreId}
//               />


//             </div>
//           )}

//           {/* Top / Low selling products — this month ki sales report se */}
//                    {isBackOffice && canSales && (
//             <div className="mb-8">
//               <TopLowSellingProducts
//                 role={role}
//                 user={user_data}
//                 filters={{ branch_id: managerBranchId || "ALL" }}
//                 storeId={adminStoreId}
//               />
//             </div>
//           )}

//           {/* Bottom widgets */}
//           {isBackOffice && (showLeftCol || showRightCol) && (
//             <div
//               className={`grid grid-cols-1 gap-6 ${showLeftCol && showRightCol ? "lg:grid-cols-2" : ""
//                 }`}
//             >
//               {showLeftCol && (
//                 <div className="flex flex-col gap-6">
//                   {canFinancial && (
//                     <ProfitLossWidget role={role} user={user_data} />
//                   )}
//                   {canStock && (
//                     <LowStockAlert
//                       role={role}
//                       user={user_data}
//                       filters={{ branch_id: "ALL" }}
//                     />
//                   )}
//                 </div>
//               )}
//               {showRightCol && (
//                 <div className="flex flex-col gap-6">
//                  {canBills && (
//                     <RecentSalesFeed
//                       role={role}
//                       user={user_data}
//                       filters={{ branch_id: managerBranchId || "ALL" }}
//                       storeId={adminStoreId}
//                     />
//                   )}
//                   {canCustomers && (
//                     <CustomerDuesWidget
//                       role={role}
//                       user={user_data}
//                       filters={{ branch_id: managerBranchId || "ALL" }}
//                              storeId={adminStoreId}
//                     />
//                   )}
//                   {/* {canSales && (
//                     <TaxAndActionsWidget
//                       taxBreakdown={sk?.tax_breakdown}
//                       loading={loading}
//                     />
//                   )} */}
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </Layout>
//   );



// };

// export default Home;







import React, { useEffect, useState } from "react";

import Layout from "./layout";

import ProfitLossWidget from "./ProfitLossWidget";

import LowStockAlert from "./lowStockAlert";

import StatCard from "./StatCard";

import PaymentBreakdown from "./PaymentBreakdown";

import MonthlySalesChart from "./MonthlySalesChart";

import TopLowSellingProducts from "./TopLowSellingProducts";

import CustomerDuesWidget from "./CustomerDuesWidget";

import RecentSalesFeed from "./RecentSalesFeed";

// import TaxAndActionsWidget from "./TaxAndActionsWidget";

import { hasFeature } from "../utils/hasFeature";

import { useAppData } from "../context/AppDataContext";

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
  const user_data = JSON.parse(
    localStorage.getItem("user_detail")
  );

  const role = user_data?.user?.role;

  const {
    dashboard,
    loadDashboard,
  } = useAppData();

  const [loading, setLoading] = useState(true);

  const canSales = hasFeature("reports_sales");
  const canPurchase = hasFeature("reports_purchase");
  const canFinancial = hasFeature("reports_financial");
  const canStock = hasFeature("stock_alerts");
  const canBills = hasFeature("sales_bills");
  const canCustomers = hasFeature("customers");

  // Manager's own branch - admin sees all branches, manager is scoped to one
  const managerBranchId =
    role === "manager"
      ? user_data?.branch_id ??
      user_data?.user?.branch_id ??
      user_data?.user?.branch_ids?.[0] ??
      user_data?.branch_ids?.[0] ??
      null
      : null;

  // Admin's own store
  const adminStoreId =
    role === "admin"
      ? user_data?.user?.store_id ?? null
      : null;

  const isBackOffice =
    role === "admin" || role === "manager";

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

  // Dashboard data comes from AppDataContext
  const stores = dashboard?.stores || [];
  const todaySales = dashboard?.todaySales || null;
  const todayPurchase = dashboard?.todayPurchase || null;
  const monthProducts = dashboard?.monthProducts || [];
  const customerDues = dashboard?.customerDues || [];
  const saleBills = dashboard?.saleBills || [];
  const recentInvoices = dashboard?.recentInvoices || [];

  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      if (!dashboard) {
        setLoading(true);
      }

      try {
        await loadDashboard();
      } catch (err) {
        console.error(
          "Dashboard load error:",
          err
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [role, loadDashboard, dashboard]);

  const rupee = (v) =>
    `₹${Number(v || 0).toLocaleString("en-IN")}`;

  const sk = todaySales?.kpis;
  const pk = todayPurchase?.kpis;

  const paymentRows =
    todaySales?.payment_methods?.rows || [];

  const topMethod = [...paymentRows].sort(
    (a, b) =>
      (b.total_collected || 0) -
      (a.total_collected || 0)
  )[0];

  // bottom section — kaunse columns dikhane hain
  const showLeftCol =
    canFinancial || canStock;

  const showRightCol =
    canBills || canCustomers || canSales;

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

          {/* ---------------- ADMIN / MANAGER ---------------- */}
          {nothingEnabled && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">
                Empty Dashboard
              </h3>

              <p className="text-gray-500">
                There is no dashboard features enable
                for your account. You can use available
                menus from the left side menu or kindly
                contact your Admin.
              </p>
            </div>
          )}

          {isBackOffice &&
            (canSales || canPurchase) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

                {canSales && (
                  <StatCard
                    icon={<IconCart />}
                    label="Total Sales (Today)"
                    value={
                      loading || !sk
                        ? "-"
                        : rupee(sk.gross_sales)
                    }
                    color="#2377FC"
                    loading={loading}
                  />
                )}

                {canPurchase && (
                  <StatCard
                    icon={<IconInbox />}
                    label="Total Purchase (Today)"
                    value={
                      loading || !pk
                        ? "-"
                        : rupee(
                          pk.total_purchase_value
                        )
                    }
                    color="#F59E0B"
                    loading={loading}
                  />
                )}

                {canSales && (
                  <StatCard
                    icon={<IconAlertCircle />}
                    label="Total Dues (Today)"
                    value={
                      loading || !sk
                        ? "-"
                        : rupee(sk.total_due)
                    }
                    color="#FC2359"
                    loading={loading}
                  />
                )}

                {canSales && (
                  <StatCard
                    icon={<IconWallet />}
                    label="Top Payment Method"
                    value={
                      loading || !topMethod
                        ? "-"
                        : `${topMethod.method} · ${topMethod.share_pct}%`
                    }
                    color="#8B5CF6"
                    loading={loading}
                  />
                )}

              </div>
            )}

          {/* Payment split + Monthly sales chart */}
          {isBackOffice && canSales && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

              <PaymentBreakdown
                role={role}
                user={user_data}
                storeId={adminStoreId}
              />

              <MonthlySalesChart
                role={role}
                user={user_data}
                filters={{
                  branch_id:
                    role === "manager"
                      ? managerBranchId
                      : "",
                }}
                storeId={adminStoreId}
              />

            </div>
          )}

          {/* Top / Low selling products */}
          {isBackOffice && canSales && (
            <div className="mb-8">
              <TopLowSellingProducts
                role={role}
                user={user_data}
                filters={{
                  branch_id:
                    managerBranchId || "ALL",
                }}
                storeId={adminStoreId}
              />
            </div>
          )}

          {/* Bottom widgets */}
          {isBackOffice &&
            (showLeftCol || showRightCol) && (
              <div
                className={`grid grid-cols-1 gap-6 ${showLeftCol && showRightCol
                    ? "lg:grid-cols-2"
                    : ""
                  }`}
              >

                {showLeftCol && (
                  <div className="flex flex-col gap-6">

                    {canFinancial && (
                      <ProfitLossWidget
                        role={role}
                        user={user_data}
                      />
                    )}

                    {canStock && (
                      <LowStockAlert
                        role={role}
                        user={user_data}
                        filters={{
                          branch_id: "ALL",
                        }}
                      />
                    )}

                  </div>
                )}

                {showRightCol && (
                  <div className="flex flex-col gap-6">

                    {canBills && (
                      <RecentSalesFeed
                        role={role}
                        user={user_data}
                        filters={{
                          branch_id:
                            managerBranchId || "ALL",
                        }}
                        storeId={adminStoreId}
                      />
                    )}

                    {canCustomers && (
                      <CustomerDuesWidget
                        role={role}
                        user={user_data}
                        filters={{
                          branch_id:
                            managerBranchId || "ALL",
                        }}
                        storeId={adminStoreId}
                      />
                    )}

                    {/* 
                    {canSales && (
                      <TaxAndActionsWidget
                        taxBreakdown={sk?.tax_breakdown}
                        loading={loading}
                      />
                    )}
                    */}

                  </div>
                )}

              </div>
            )}

        </div>
      </div>
    </Layout>
  );
};

export default Home;