import React from "react";
import { AppDataProvider } from "./context/AppDataContext";
import "./App.css";
import "../src/assets/css/style.css";
import "../src/assets/font/fonts.css";
import "../src/assets/icon/style.css";
import Home from "./components/home";
import Register from "./components/register";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
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

const isAuthenticated = () => {
  const storedData = localStorage.getItem("user_detail");
  const userDetail = storedData ? JSON.parse(storedData) : null;
  return !!userDetail?.token;
};

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
        theme="colored" // dark / light / colored
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
        }}
      />

      <Router>
        <Switch>
          <PublicRoute exact path="/" component={Login} />
          <PublicRoute exact path="/register" component={Register} />
          <PublicRoute exact path="/cashier_login" component={CashierLogin} />
          <ProtectedRoute
            exact
            path="/change-password"
            component={ChangePassword}
          />
          <ProtectedRoute exact path="/pos" component={POS} />
          <ProtectedRoute exact path="/dashboard" component={Home} />

          <ProtectedRoute
            exact
            path="/product"
            component={Product}
            requiredFeature="products"
          />
          <ProtectedRoute
            exact
            path="/print-barcode"
            component={PrintBarcode}
            requiredFeature="products"
          />
          <ProtectedRoute
            exact
            path="/create-product"
            component={CreateEditProduct}
            requiredFeature="products"
          />
          <ProtectedRoute
            path="/product/edit/:id"
            component={CreateEditProduct}
            requiredFeature="products"
          />
          <ProtectedRoute
            path="/expired-products"
            component={DiscardProducts}
            requiredFeature="products"
          />

          <ProtectedRoute exact path="/store" component={Store} />
          <ProtectedRoute exact path="/stores/view/:id" component={ViewStore} />
          <ProtectedRoute
            exact
            path="/create-store/:id?"
            component={CreateStore}
          />

          <ProtectedRoute
            exact
            path="/branch"
            component={Branch}
            requiredFeature="branch_management"
          />
          <ProtectedRoute
            exact
            path="/create-branch"
            component={CreateEditBranch}
            requiredFeature="branch_management"
          />
          <ProtectedRoute
            path="/branch/edit/:id"
            component={CreateEditBranch}
            requiredFeature="branch_management"
          />

          <ProtectedRoute exact path="/category" component={Category} />
          <ProtectedRoute
            exact
            path="/create-category"
            component={CreateEditCategory}
          />
          <ProtectedRoute
            path="/category/edit/:id"
            component={CreateEditCategory}
          />

          <ProtectedRoute
            exact
            path="/purchase-return-bill"
            component={PurchaseReturn}
            requiredFeature="purchase_returns"
          />
          <ProtectedRoute
            exact
            path="/create-purchase-return-bill"
            component={CreateEditPurchaseReturn}
            requiredFeature="purchase_returns"
          />
          <ProtectedRoute
            exact
            path="/purchase-return-bill/edit/:id"
            component={CreateEditPurchaseReturn}
            requiredFeature="purchase_returns"
          />
          <ProtectedRoute
            exact
            path="/create-purchase-replace"
            component={CreatePurchaseReplace}
            requiredFeature="purchase_returns"
          />

          <ProtectedRoute
            exact
            path="/purchase-bill"
            component={PurchaseBill}
            requiredFeature="purchase_bills"
          />
          <ProtectedRoute
            exact
            path="/create-purchase-bill"
            component={CreateEditPurchaseBill}
            requiredFeature="purchase_bills"
          />
          <ProtectedRoute
            path="/purchase-bill/edit/:id"
            component={CreateEditPurchaseBill}
            requiredFeature="purchase_bills"
          />

          <ProtectedRoute
            exact
            path="/sale-bill"
            component={SaleBill}
            requiredFeature="sales_bills"
          />
          <ProtectedRoute
            exact
            path="/create-sale-bill"
            component={CreateEditSaleBill}
            requiredFeature="sales_bills"
          />

          <ProtectedRoute
            exact
            path="/sales-bill/return"
            component={SalesReturn}
            requiredFeature="sales_returns"
          />
          <ProtectedRoute
            exact
            path="/sales-return/list"
            component={SalesReturnList}
            requiredFeature="sales_returns"
          />

          <ProtectedRoute
            exact
            path="/advancepayment"
            component={AdvancePayment}
            requiredFeature="customers"
          />

          <ProtectedRoute
            exact
            path="/suppliers"
            component={SupplierBill}
            requiredFeature="suppliers"
          />
          <ProtectedRoute
            exact
            path="/create-suppliers"
            component={CreateEditSupplier}
            requiredFeature="suppliers"
          />
          <ProtectedRoute
            exact
            path="/suppliers/edit/:id"
            component={CreateEditSupplier}
            requiredFeature="suppliers"
          />

          <ProtectedRoute exact path="/brand" component={Brand} />
          <ProtectedRoute
            exact
            path="/create-brand"
            component={CreateEditBrand}
          />
          <ProtectedRoute path="/brand/edit/:id" component={CreateEditBrand} />

          <ProtectedRoute
            exact
            path="/create-staff"
            component={CreateEditStaff}
            requiredFeature="staff_management"
          />
          <ProtectedRoute
            path="/staff/edit/:id"
            component={CreateEditStaff}
            requiredFeature="staff_management"
          />
          <ProtectedRoute
            exact
            path="/staff"
            component={Staff}
            requiredFeature="staff_management"
          />

          <ProtectedRoute
            exact
            path="/gst-rates"
            component={GstRate}
            requiredFeature="gst_rates"
          />
          <ProtectedRoute
            exact
            path="/create-gst-rates"
            component={CreateEditGstRates}
            requiredFeature="gst_rates"
          />
          <ProtectedRoute
            path="/gst-rates/edit/:id"
            component={CreateEditGstRates}
            requiredFeature="gst_rates"
          />

          <ProtectedRoute
            path="/stock-expiry-alerts"
            component={StockExpiryAlertsPage}
            requiredFeature="stock_alerts"
          />
          <ProtectedRoute
            path="/reports/stock-summary"
            component={StockSummury}
            requiredFeature="stock_alerts"
          />
          <ProtectedRoute
            path="/reports/stock-expiry-report"
            component={stockExpiryReport}
            requiredFeature="stock_alerts"
          />

          <ProtectedRoute
            path="/reports/purchase-summary"
            component={PurchaseSummary}
            requiredFeature="reports_purchase"
          />
          <ProtectedRoute
            path="/reports/purchase-report"
            component={PurchaseReport}
            requiredFeature="reports_purchase"
          />
          <ProtectedRoute
            path="/reports/price-override"
            component={PriceOverride}
            requiredFeature="reports_purchase"
          />

          <ProtectedRoute
            path="/reports/sales-analytics"
            component={SalesAnalytics}
            requiredFeature="reports_sales"
          />
          <ProtectedRoute
            path="/reports/sales-report"
            component={SalesReport}
            requiredFeature="reports_sales"
          />

          <ProtectedRoute
            path="/reports/gst-output-sales"
            component={GstReports}
            requiredFeature="reports_gst"
          />
          <ProtectedRoute
            path="/reports/GSTR3B"
            component={GSTR3BReport}
            requiredFeature="reports_gst"
          />
          <ProtectedRoute
            path="/reports/GSTR1-Summary"
            component={GSTR1Summary}
            requiredFeature="reports_gst"
          />

          <ProtectedRoute
            path="/reports/financial-report"
            component={FinancialReport}
            requiredFeature="reports_financial"
          />

          {/* backend me bhi ye ungated hai (cashier ka apna register/shift core flow hai), isliye yahan bhi feature nahi laga */}
          <ProtectedRoute
            path="/reports/shift-report"
            component={ShiftHistory}
          />

          {/* pehle plain <Route> tha, koi login-check hi nahi ho raha tha — fix kiya */}
          <ProtectedRoute
            path="/customer-dues"
            component={CustomerDues}
            requiredFeature="customers"
          />

          <Route path="*" component={Login} />
        </Switch>
      </Router>
    </AppDataProvider>
  );
}

export default App;
