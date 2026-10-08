
import React from "react";

import { AppDataProvider } from "./context/AppDataContext";

import "./App.css";
import "../src/assets/css/style.css";
import "../src/assets/font/fonts.css";
import "../src/assets/icon/style.css";

import Home from "./components/home";
import Register from "./components/register";

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Navigate,
  Router,
} from "react-router-dom";

import Login from "./components/login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Product from "./components/product";
import PrintBarcode from "./components/printBarcode";
import Store from "./components/store";
import CreateStore from "./components/createStore";
import ViewStore from "./components/viewStore";
import Branch from "./components/branch";
import CashierLogin from "./components/cashierLogin";
import Category from "./components/category";
import PurchaseBill from "./components/purchaseBill";
import SupplierBill from "./components/suppllier";
import Brand from "./components/brand";
import CreateEditProduct from "./components/createEditProduct";
import CreateEditBranch from "./components/createEditBranch";
import CreateEditCategory from "./components/createEditCategory";
import CreateEditBrand from "./components/createEditBrand";
import GstRate from "./components/gstRate";
import Staff from "./components/staff";
import CreateEditStaff from "./components/createEditStaff";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import CreateEditPurchaseBill from "./components/createEditPurchaseBill";
import SaleBill from "./components/saleBill";
import CreateEditSaleBill from "./components/createEditSaleBill";
import POS from "./components/POS";
import CreateEditSupplier from "./components/createEditSupplier";
import CreateEditGstRates from "./components/createEditGstRate";
import PurchaseReturn from "./components/purchaseReturn";
import CreateEditPurchaseReturn from "./components/createEditPurchaseReturn";
import StockExpiryAlertsPage from "./components/ExpiryAlertModal";

import StockSummury from "./components/reports/stockSummury";
import PurchaseSummary from "./components/reports/PurchaseSummary";
import SalesAnalytics from "./components/reports/SalesAnalytics";
import PriceOverride from "./components/reports/PriceOverride";
import GstReports from "./components/reports/GstReports";
import GSTR3BReport from "./components/reports/GSTR3BReport";
import GSTR1Summary from "./components/reports/GSTR1Summary";

import CreatePurchaseReplace from "./components/createPurchaseReplace";
import CustomerDues from "./components/CustomerDues";
import SalesReport from "./components/reports/SalesReport";
import PurchaseReport from "./components/reports/PurchaseReport";
import FinancialReport from "./components/reports/FinancialReport";

import SalesReturn from "./components/SalesReturn";
import SalesReturnList from "./components/SalesReturnList";
import ShiftHistory from "./components/reports/ShiftHistoryReport";
import stockExpiryReport from "./components/reports/stockExpiryReport";
import DiscardProducts from "./components/DiscartProducts";
import AdvancePayment from "./components/AdvancePayment";
import ChangePassword from "./components/ChangePassword";
import customer from "./components/customer";
import AiInsights from "./components/AiInsights";
import SupplierTracking from "./components/reports/SuplierTracking";

import CustomerPortalLogin from "./components/CustomerPortalLogin";

const Protected = ({ Component, requiredFeature }) => {
  return (
    <ProtectedRoute
      component={Component}
      requiredFeature={requiredFeature}
    />
  );
};

const Public = ({ Component }) => {
  return <PublicRoute component={Component} />;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Customer Portal */}
      <Route
        path="/customer-portal"
        element={<CustomerPortalLogin />}
      />

      {/* Public Routes */}
      <Route
        path="/"
        element={<Public Component={Login} />}
      />

      <Route
        path="/register"
        element={<Public Component={Register} />}
      />

      <Route
        path="/cashier_login"
        element={<Public Component={CashierLogin} />}
      />

      {/* Protected Routes */}
      <Route
        path="/change-password"
        element={<Protected Component={ChangePassword} />}
      />

      <Route
        path="/pos"
        element={<Protected Component={POS} />}
      />

      <Route
        path="/dashboard"
        element={<Protected Component={Home} />}
      />

      {/* Products */}
      <Route
        path="/product"
        element={
          <Protected
            Component={Product}
            requiredFeature="products"
          />
        }
      />

      <Route
        path="/print-barcode"
        element={
          <Protected
            Component={PrintBarcode}
            requiredFeature="products"
          />
        }
      />

      <Route
        path="/create-product"
        element={
          <Protected
            Component={CreateEditProduct}
            requiredFeature="products"
          />
        }
      />

      <Route
        path="/product/edit/:id"
        element={
          <Protected
            Component={CreateEditProduct}
            requiredFeature="products"
          />
        }
      />

      <Route
        path="/expired-products"
        element={
          <Protected
            Component={DiscardProducts}
            requiredFeature="stock_alerts"
          />
        }
      />

      {/* Store */}
      <Route
        path="/store"
        element={<Protected Component={Store} />}
      />

      <Route
        path="/stores/view/:id"
        element={<Protected Component={ViewStore} />}
      />

      <Route
        path="/create-store/:id?"
        element={<Protected Component={CreateStore} />}
      />

      {/* Branch */}
      <Route
        path="/branch"
        element={
          <Protected
            Component={Branch}
            requiredFeature="branch_management"
          />
        }
      />

      <Route
        path="/create-branch"
        element={
          <Protected
            Component={CreateEditBranch}
            requiredFeature="branch_management"
          />
        }
      />

      <Route
        path="/branch/edit/:id"
        element={
          <Protected
            Component={CreateEditBranch}
            requiredFeature="branch_management"
          />
        }
      />

      {/* Category */}
      <Route
        path="/category"
        element={<Protected Component={Category} />}
      />

      <Route
        path="/create-category"
        element={<Protected Component={CreateEditCategory} />}
      />

      <Route
        path="/category/edit/:id"
        element={<Protected Component={CreateEditCategory} />}
      />

      {/* Purchase Return */}
      <Route
        path="/purchase-return-bill"
        element={
          <Protected
            Component={PurchaseReturn}
            requiredFeature="purchase_returns"
          />
        }
      />

      <Route
        path="/create-purchase-return-bill"
        element={
          <Protected
            Component={CreateEditPurchaseReturn}
            requiredFeature="purchase_returns"
          />
        }
      />

      <Route
        path="/purchase-return-bill/edit/:id"
        element={
          <Protected
            Component={CreateEditPurchaseReturn}
            requiredFeature="purchase_returns"
          />
        }
      />

      <Route
        path="/create-purchase-replace"
        element={
          <Protected
            Component={CreatePurchaseReplace}
            requiredFeature="purchase_returns"
          />
        }
      />

      {/* Purchase Bills */}
      <Route
        path="/purchase-bill"
        element={
          <Protected
            Component={PurchaseBill}
            requiredFeature="purchase_bills"
          />
        }
      />

      <Route
        path="/create-purchase-bill"
        element={
          <Protected
            Component={CreateEditPurchaseBill}
            requiredFeature="purchase_bills"
          />
        }
      />

      <Route
        path="/purchase-bill/edit/:id"
        element={
          <Protected
            Component={CreateEditPurchaseBill}
            requiredFeature="purchase_bills"
          />
        }
      />

      {/* Sales */}
      <Route
        path="/sale-bill"
        element={<Protected Component={SaleBill} />}
      />

      <Route
        path="/create-sale-bill"
        element={<Protected Component={CreateEditSaleBill} />}
      />

      {/* Sales Return */}
      <Route
        path="/sales-bill/return"
        element={
          <Protected
            Component={SalesReturn}
            requiredFeature="sales_returns"
          />
        }
      />

      <Route
        path="/sales-return/list"
        element={
          <Protected
            Component={SalesReturnList}
            requiredFeature="sales_returns"
          />
        }
      />

      {/* Advance Payment */}
      <Route
        path="/advancepayment"
        element={
          <Protected
            Component={AdvancePayment}
            requiredFeature="advance_payments"
          />
        }
      />

      {/* Suppliers */}
      <Route
        path="/suppliers"
        element={
          <Protected
            Component={SupplierBill}
            requiredFeature="suppliers"
          />
        }
      />

      <Route
        path="/create-suppliers"
        element={
          <Protected
            Component={CreateEditSupplier}
            requiredFeature="suppliers"
          />
        }
      />

      <Route
        path="/suppliers/edit/:id"
        element={
          <Protected
            Component={CreateEditSupplier}
            requiredFeature="suppliers"
          />
        }
      />

      {/* Brand */}
      <Route
        path="/brand"
        element={<Protected Component={Brand} />}
      />

      <Route
        path="/create-brand"
        element={<Protected Component={CreateEditBrand} />}
      />

      <Route
        path="/brand/edit/:id"
        element={<Protected Component={CreateEditBrand} />}
      />

      {/* Staff */}
      <Route
        path="/create-staff"
        element={
          <Protected
            Component={CreateEditStaff}
            requiredFeature="staff_management"
          />
        }
      />

      <Route
        path="/staff/edit/:id"
        element={
          <Protected
            Component={CreateEditStaff}
            requiredFeature="staff_management"
          />
        }
      />

      <Route
        path="/staff"
        element={
          <Protected
            Component={Staff}
            requiredFeature="staff_management"
          />
        }
      />

      {/* Customers */}
      <Route
        path="/customers"
        element={
          <Protected
            Component={customer}
            requiredFeature="customers"
          />
        }
      />

      {/* GST Rates */}
      <Route
        path="/gst-rates"
        element={
          <Protected
            Component={GstRate}
            requiredFeature="gst_rates"
          />
        }
      />

      <Route
        path="/create-gst-rates"
        element={
          <Protected
            Component={CreateEditGstRates}
            requiredFeature="gst_rates"
          />
        }
      />

      <Route
        path="/gst-rates/edit/:id"
        element={
          <Protected
            Component={CreateEditGstRates}
            requiredFeature="gst_rates"
          />
        }
      />

      {/* Stock / Alerts */}
      <Route
        path="/stock-expiry-alerts"
        element={
          <Protected
            Component={StockExpiryAlertsPage}
            requiredFeature="stock_alerts"
          />
        }
      />

      {/* Reports */}
      <Route
        path="/reports/stock-summary"
        element={
          <Protected
            Component={StockSummury}
            requiredFeature="reports_stock"
          />
        }
      />

      <Route
        path="/reports/stock-expiry-report"
        element={
          <Protected
            Component={stockExpiryReport}
            requiredFeature="stock_alerts"
          />
        }
      />

      <Route
        path="/reports/purchase-summary"
        element={
          <Protected
            Component={PurchaseSummary}
            requiredFeature="reports_purchase"
          />
        }
      />

      <Route
        path="/reports/purchase-report"
        element={
          <Protected
            Component={PurchaseReport}
            requiredFeature="reports_purchase"
          />
        }
      />

      <Route
        path="/reports/price-override"
        element={
          <Protected
            Component={PriceOverride}
            requiredFeature="price_override"
          />
        }
      />

      <Route
        path="/reports/sales-analytics"
        element={
          <Protected
            Component={SalesAnalytics}
            requiredFeature="reports_sales"
          />
        }
      />

      <Route
        path="/reports/sales-report"
        element={
          <Protected
            Component={SalesReport}
            requiredFeature="reports_sales"
          />
        }
      />

      <Route
        path="/reports/gst-output-sales"
        element={
          <Protected
            Component={GstReports}
            requiredFeature="reports_gst"
          />
        }
      />

      <Route
        path="/reports/GSTR3B"
        element={
          <Protected
            Component={GSTR3BReport}
            requiredFeature="reports_gst"
          />
        }
      />

      <Route
        path="/reports/GSTR1-Summary"
        element={
          <Protected
            Component={GSTR1Summary}
            requiredFeature="reports_gst"
          />
        }
      />

      <Route
        path="/reports/financial-report"
        element={
          <Protected
            Component={FinancialReport}
            requiredFeature="reports_financial"
          />
        }
      />

      <Route
        path="/reports/shift-report"
        element={
          <Protected
            Component={ShiftHistory}
            requiredFeature="reports_shift"
          />
        }
      />

      {/* Customer Dues */}
      <Route
        path="/customer-dues"
        element={
          <Protected
            Component={CustomerDues}
            requiredFeature="customers"
          />
        }
      />

        <Route
        path="/supplier-tracking"
        element={
          <Protected
            Component={SupplierTracking}
            requiredFeature="reports_suplier"
          />
        }
      />

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </>
  )
);

function App() {
  return (
    <AppDataProvider>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
        }}
      />

      <RouterProvider router={router} />
    </AppDataProvider>
  );
}

export default App;