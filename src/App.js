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
          <ProtectedRoute exact path="/pos" component={POS} />
          <ProtectedRoute exact path="/dashboard" component={Home} />
          <ProtectedRoute exact path="/product" component={Product} />
          <ProtectedRoute
            exact
            path="/print-barcode"
            component={PrintBarcode}
          />
          <ProtectedRoute
            exact
            path="/create-product"
            component={CreateEditProduct}
          />
          <ProtectedRoute
            path="/product/edit/:id"
            component={CreateEditProduct}
          />
          <ProtectedRoute exact path="/store" component={Store} />
          <ProtectedRoute exact path="/stores/view/:id" component={ViewStore} />
          <ProtectedRoute
            exact
            path="/create-store/:id?"
            component={CreateStore}
          />
          <ProtectedRoute exact path="/branch" component={Branch} />
          <ProtectedRoute
            exact
            path="/create-branch"
            component={CreateEditBranch}
          />
          <ProtectedRoute
            path="/branch/edit/:id"
            component={CreateEditBranch}
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
          />
          <ProtectedRoute
            exact
            path="/create-purchase-return-bill"
            component={CreateEditPurchaseReturn}
          />
          <ProtectedRoute
            exact
            path="/purchase-return-bill/edit/:id"
            component={CreateEditPurchaseReturn}
          />
          <ProtectedRoute
            exact
            path="/create-purchase-replace"
            component={CreatePurchaseReplace}
          />
          <ProtectedRoute
            exact
            path="/purchase-bill"
            component={PurchaseBill}
          />
          <ProtectedRoute
            exact
            path="/create-purchase-bill"
            component={CreateEditPurchaseBill}
          />
          <ProtectedRoute
            path="/purchase-bill/edit/:id"
            component={CreateEditPurchaseBill}
          />
          <ProtectedRoute exact path="/sale-bill" component={SaleBill} />
          <ProtectedRoute
            exact
            path="/create-sale-bill"
            component={CreateEditSaleBill}
          />
          <ProtectedRoute
            exact
            path="/sales-bill/return"
            component={SalesReturn}
          />
          <ProtectedRoute
            exact
            path="/sales-return/list"
            component={SalesReturnList}
          />

          <ProtectedRoute
            exact
            path="/advancepayment"
            component={AdvancePayment}
          />

          <ProtectedRoute exact path="/suppliers" component={SupplierBill} />
          <ProtectedRoute
            exact
            path="/create-suppliers"
            component={CreateEditSupplier}
          />
          <ProtectedRoute
            exact
            path="/suppliers/edit/:id"
            component={CreateEditSupplier}
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
          />
          <ProtectedRoute path="/staff/edit/:id" component={CreateEditStaff} />

          <ProtectedRoute exact path="/gst-rates" component={GstRate} />
          <ProtectedRoute exact path="/staff" component={Staff} />
          <ProtectedRoute
            exact
            path="/create-gst-rates"
            component={CreateEditGstRates}
          />
          <ProtectedRoute
            path="/gst-rates/edit/:id"
            component={CreateEditGstRates}
          />
          <ProtectedRoute
            path="/stock-expiry-alerts"
            component={StockExpiryAlertsPage}
          />
          <ProtectedRoute
            path="/reports/stock-summary"
            component={StockSummury}
          />
          <ProtectedRoute
            path="/reports/purchase-summary"
            component={PurchaseSummary}
          />
          <ProtectedRoute
            path="/reports/sales-analytics"
            component={SalesAnalytics}
          />
          <ProtectedRoute
            path="/reports/price-override"
            component={PriceOverride}
          />
          <ProtectedRoute
            path="/reports/gst-output-sales"
            component={GstReports}
          />
          <ProtectedRoute path="/reports/GSTR3B" component={GSTR3BReport} />
          <ProtectedRoute
            path="/reports/GSTR1-Summary"
            component={GSTR1Summary}
          />
          <ProtectedRoute
            path="/reports/sales-report"
            component={SalesReport}
          />
          <ProtectedRoute
            path="/reports/purchase-report"
            component={PurchaseReport}
          />
          <ProtectedRoute
            path="/reports/financial-report"
            component={FinancialReport}
          />

          <ProtectedRoute
            path="/reports/shift-report"
            component={ShiftHistory}
          />

          <ProtectedRoute
            path="/reports/stock-expiry-report"
            component={stockExpiryReport}
          />

          <ProtectedRoute
            path="/expired-products"
            component={DiscardProducts}
          />

          <Route path="/customer-dues" component={CustomerDues} />
          <Route path="*" component={Login} />
        </Switch>
      </Router>
    </AppDataProvider>
  );
}

export default App;
