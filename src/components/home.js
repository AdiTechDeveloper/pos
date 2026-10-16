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
import { hasFeature } from "../utils/hasFeature";
import { useAppData } from "../context/AppDataContext";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

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

const IconCash = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const IconBank = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M3 10l9-6 9 6" />
    <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
    <path d="M3 20h18" />
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
  const [money, setMoney] = useState(null);

  const canSales = hasFeature("reports_sales");
  const canPurchase = hasFeature("reports_purchase");
  const canFinancial = hasFeature("reports_financial");
  const canStock = hasFeature("stock_alerts");
  const canBills = hasFeature("sales_bills");
  const canCustomers = hasFeature("customers");

  const managerBranchId =
    role === "manager"
      ? user_data?.branch_id ??
      user_data?.user?.branch_id ??
      user_data?.user?.branch_ids?.[0] ??
      user_data?.branch_ids?.[0] ??
      null
      : null;

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

// Cash in hand, bank balance, customer dues, supplier dues
useEffect(() => {
  if (role !== "admin" && role !== "manager") return;

  let mounted = true;

  const token =
    user_data?.token ||
    user_data?.access_token ||
    user_data?.user?.token;

  const loadMoney = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/dashboard/money-summary`,
        {
          params: { branch_id: managerBranchId || 0 },
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (mounted) setMoney(res.data?.data || null);
    } catch (err) {
      console.error("Money summary error:", err?.response || err);
    }
  };

  loadMoney();

  return () => {
    mounted = false;
  };
}, [role, managerBranchId]);

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

  const showLeftCol =
    canFinancial || canStock;

  const showRightCol =
    canBills || canCustomers || canSales;

  const showMoneyRow =
    isBackOffice &&
    (canFinancial ||
      canCustomers ||
      canSales ||
      canPurchase);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">

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

          {showMoneyRow && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

              {canFinancial && (
                <StatCard
                  icon={<IconCash />}
                  label="Cash in Hand"
                  value={
                    money ? rupee(money.cash_in_hand) : "-"
                  }
                  color="#22C55E"
                  loading={!money}
                />
              )}

              {canFinancial && (
                <StatCard
                  icon={<IconBank />}
                  label="Bank Balance"
                  value={
                    money ? rupee(money.bank_balance) : "-"
                  }
                  color="#0EA5E9"
                  loading={!money}
                />
              )}

              {(canCustomers || canSales) && (
                <StatCard
                  icon={<IconAlertCircle />}
                  label="Customer Dues (Total)"
                  value={
                    money ? rupee(money.customer_dues) : "-"
                  }
                  color="#FC2359"
                  loading={!money}
                />
              )}

              {canPurchase && (
                <StatCard
                  icon={<IconInbox />}
                  label="Supplier Dues (Total)"
                  value={
                    money ? rupee(money.supplier_dues) : "-"
                  }
                  color="#F59E0B"
                  loading={!money}
                />
              )}

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