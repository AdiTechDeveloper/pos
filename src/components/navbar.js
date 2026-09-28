import React, { useState, useEffect } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import axios from "axios";
import { useAppData } from "../context/AppDataContext";

import { PiKeyReturnBold, PiWallet } from "react-icons/pi";

import {
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {
  IoHomeOutline,
  IoCubeOutline,
  IoReceiptOutline,
  IoCartOutline,
  IoBarChartOutline,
  IoPricetagsOutline,
  IoDesktopOutline,
  IoGridOutline,
  IoStorefrontOutline,
  IoWalletOutline,
  IoLockOpenOutline,
  IoPrintOutline,
  IoExitOutline,
} from "react-icons/io5";
import { hasFeature } from "../utils/hasFeature";
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
} from "react-icons/fa";

import {
  FiHelpCircle,
  FiHeadphones,
  FiFileText,
} from "react-icons/fi";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Navbar = () => {
  const history = useHistory();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const user_detail = JSON.parse(
    localStorage.getItem("user_detail") || "null"
  );

  const role = user_detail?.user?.role;
  const store_id = user_detail?.user?.store_id;

  const appData = useAppData();
  const store = appData?.store || null;

  /* =========================================================
      REPORT LINKS
  ========================================================= */

  const reportLinks = [
    {
      name: "Stock Summary",
      path: "/reports/stock-summary",
    },
    {
      name: "Purchase Summary",
      path: "/reports/purchase-summary",
    },
    {
      name: "Sales Analytics",
      path: "/reports/sales-analytics",
    },
    {
      name: "GST Output",
      path: "/reports/gst-output-sales",
    },
    {
      name: "GSTR - 3B",
      path: "/reports/GSTR3B",
    },
    {
      name: "GSTR1 Summary",
      path: "/reports/GSTR1-Summary",
    },
    {
      name: "Price Override Summary",
      path: "/reports/price-override",
    },
    {
      name: "Sales Report",
      path: "/reports/sales-report",
    },
    {
      name: "Purchase Report",
      path: "/reports/purchase-report",
    },
    {
      name: "Financial Report",
      path: "/reports/financial-report",
    },
    {
      name: "Shift History Report",
      path: "/reports/shift-report",
    },
    {
      name: "Stock Expiry",
      path: "/reports/stock-expiry-report",
    },
  ];

  const isActive = (path) => location.pathname === path;

  const isReportPath = reportLinks.some(
    (item) => location.pathname === item.path
  );

  /* =========================================================
      STORE
  ========================================================= */

  useEffect(() => {
    if (store_id) {
      appData?.loadStore(store_id);
    }
  }, [store_id, appData]);

  /* =========================================================
      AUTO OPEN REPORTS
  ========================================================= */

  useEffect(() => {
    if (isReportPath) {
      setReportsOpen(true);
    }
  }, [isReportPath]);

  /* =========================================================
      LOGO
  ========================================================= */

  const DEFAULT_LOGO = "/assets/images/logo/vakaro-full.png";

  const logoUrl =
    role === "superadmin" || !store?.logo
      ? DEFAULT_LOGO
      : `${BASE_URL}/storage/${store.logo}`;

  /* =========================================================
      MOBILE
  ========================================================= */

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  /* =========================================================
      LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user_detail?.token}`,
            Accept: "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Logout API error:", error);
    }

    // removeItem accepts only ONE key
    localStorage.removeItem("user_detail");
    localStorage.removeItem("cart_detail");
    localStorage.removeItem("cart_total");

    sessionStorage.clear();

    history.push("/");
  };

  // Shared menus for admin + manager
  const sharedMenus = (
    <>
      {hasFeature("suppliers") && (
        <li className="menu-item">
          <Link
            to="/suppliers"
            className={`menu-item-button ${isActive("/suppliers") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <IoStorefrontOutline size={22} />
            </div>
            <div className="text">Suppliers</div>
          </Link>
        </li>
      )}

      {hasFeature("products") && (
        <li className="menu-item">
          <Link
            to="/product"
            className={`menu-item-button ${isActive("/product") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <IoCubeOutline size={22} />
            </div>
            <div className="text">Products</div>
          </Link>
        </li>
      )}

      {hasFeature("products") && (
        <li className="menu-item">
          <Link
            to="/print-barcode"
            className={`menu-item-button ${isActive("/print-barcode") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <IoPrintOutline size={22} />
            </div>
            <div className="text">Print Barcode</div>
          </Link>
        </li>
      )}

      {hasFeature("products") && (
        <li className="menu-item">
          <Link
            to="/expired-products"
            className={`menu-item-button ${isActive("/expired-products") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <IoExitOutline size={22} />
            </div>
            <div className="text">Expired Products</div>
          </Link>
        </li>
      )}

      {hasFeature("purchase_bills") && (
        <li className="menu-item">
          <Link
            to="/purchase-bill"
            className={`menu-item-button ${isActive("/purchase-bill") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <IoReceiptOutline size={22} />
            </div>
            <div className="text">Purchase Bills</div>
          </Link>
        </li>
      )}

      {hasFeature("purchase_returns") && (
        <li className="menu-item">
          <Link
            to="/purchase-return-bill"
            className={`menu-item-button ${isActive("/purchase-return-bill") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <PiKeyReturnBold />
            </div>
            <div className="text">Purchase Return Bills</div>
          </Link>
        </li>
      )}

      {hasFeature("sales_returns") && (
        <li className="menu-item">
          <Link
            to="/sale-bill"
            className={`menu-item-button ${isActive("/sale-bill") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              <IoCartOutline size={22} />
            </div>
            <div className="text">Sales Bills</div>
          </Link>
        </li>
      )}

      {/* <li className="menu-item">
        <Link
          to="/sales-bill/return"
          className={`menu-item-button ${isActive("/sales-bill/return") ? "active" : ""}`}
          onClick={closeSidebar}
        >
          <div className="icon">
            <i className="icon-printer"></i>
          </div>
          <div className="text">Sales Return</div>
        </Link>
      </li> */}

      {hasFeature("sales_returns") && (
        <li className="menu-item">
          <Link
            to="/sales-return/list"
            className={`menu-item-button ${isActive("/sales-return/list") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              {/* <IoReturnUpBack size={22} /> */}
              <PiKeyReturnBold />
            </div>
            <div className="text">Sales Return</div>
          </Link>
        </li>
      )}

      {hasFeature("customers") && (
        <li className="menu-item">
          <Link
            to="/advancepayment"
            className={`menu-item-button ${isActive("/advancepayment") ? "active" : ""}`}
            onClick={closeSidebar}
          >
            <div className="icon">
              {/* <IoReturnUpBack size={22} /> */}
              <PiWallet />
            </div>
            <div className="text">Advance Payment</div>
          </Link>
        </li>
      )}

      {(hasFeature("stock_alerts") ||
        hasFeature("reports_purchase") ||
        hasFeature("reports_sales") ||
        hasFeature("reports_gst") ||
        hasFeature("reports_financial")) && (
        <li className={`menu-item has-children ${reportsOpen ? "active" : ""}`}>
          <a
            href="#toggle-reports"
            className="menu-item-button"
            onClick={(event) => {
              event.preventDefault();
              setReportsOpen((previous) => !previous);
            }}
          >
            <div className="icon">
              <IoBarChartOutline size={22} />
            </div>
            <div className="text">Reports</div>
            {reportsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </a>
          <ul
            className="sub-menu"
            style={{ display: reportsOpen ? "block" : "none" }}
          >
            {[
              {
                name: "Stock Summary",
                path: "/reports/stock-summary",
                feature: "stock_alerts",
              },
              {
                name: "Purchase Summary",
                path: "/reports/purchase-summary",
                feature: "reports_purchase",
              },
              {
                name: "Sales Analytics",
                path: "/reports/sales-analytics",
                feature: "reports_sales",
              },
              {
                name: "GST Output",
                path: "/reports/gst-output-sales",
                feature: "reports_gst",
              },
              {
                name: "GSTR - 3B",
                path: "/reports/GSTR3B",
                feature: "reports_gst",
              },
              {
                name: "GSTR1 Summary",
                path: "/reports/GSTR1-Summary",
                feature: "reports_gst",
              },
              {
                name: "Price Override Summary",
                path: "/reports/price-override",
                feature: "reports_purchase",
              },
              {
                name: "Sales Report",
                path: "/reports/sales-report",
                feature: "reports_sales",
              },
              {
                name: "Purchase Report",
                path: "/reports/purchase-report",
                feature: "reports_purchase",
              },
              {
                name: "Financial Report",
                path: "/reports/financial-report",
                feature: "reports_financial",
              },
              {
                name: "Shift History Report",
                path: "/reports/shift-report",
                feature: null,
              },
              {
                name: "Stock Expiry",
                path: "/reports/stock-expiry-report",
                feature: "stock_alerts",
              },
            ]
              .filter((item) => !item.feature || hasFeature(item.feature))
              .map((item, index) => (
                <li key={index} className="sub-menu-item">
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    className={isActive(item.path) ? "active" : ""}
                  >
                    <div className="text">{item.name}</div>
                  </Link>
                </li>
              ))}
          </ul>
        </li>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Button */}
      <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        <i className="icon-menu-left"></i>
      </button>

      <div className={`section-menu-left ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="box-logo">
          <Link to="/dashboard" onClick={closeSidebar}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="logo"
                style={{ height: "70px", marginLeft: "25px" }}
              />
            )}
          </Link>
        </div>

        <div className="section-menu-left-wrap">
          <div className="center">
            {/* Dashboard */}
            <div className="center-item">
              <div className="center-heading">Main Home</div>
              <ul className="menu-list">
                <li className="menu-item">
                  <Link
                    to="/dashboard"
                    className={`menu-item-button ${isActive("/dashboard") ? "active" : ""}`}
                  >
                    <div className="icon">
                      <IoHomeOutline size={22} />
                    </div>
                    <div className="text">Dashboard</div>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Pages */}
            <div className="center-item">
              <div className="center-heading">All Page</div>
              <ul className="menu-list">
                {role === "superadmin" && (
                  <li className="menu-item">
                    <Link
                      to="/store"
                      className={`menu-item-button ${isActive("/store") ? "active" : ""}`}
                    >
                      <div className="icon">
                        <i className="icon-briefcase"></i>
                      </div>
                      <div className="text">Stores</div>
                    </Link>
                  </li>
                )}

                {role === "admin" && (
                  <>
                    <li className="menu-item">
                      <Link
                        to="/branch"
                        className={`menu-item-button ${isActive("/branch") ? "active" : ""}`}
                      >
                        <div className="icon">
                          <i className="icon-briefcase"></i>
                        </div>
                        <div className="text">Branches</div>
                      </Link>
                    </li>

                    {hasFeature("staff_management") && (
                      <li className="menu-item">
                        <Link
                          to="/staff"
                          className={`menu-item-button ${isActive("/staff") ? "active" : ""}`}
                        >
                          <div className="icon">
                            <i className="icon-user"></i>
                          </div>
                          <div className="text">Staff</div>
                        </Link>
                      </li>
                    )}

                    {sharedMenus}

                    <li className="menu-item">
                      <Link
                        to="/pos"
                        className={`menu-item-button ${isActive("/pos") ? "active" : ""}`}
                      >
                        <div className="icon">
                          <IoDesktopOutline size={22} />
                        </div>
                        <div className="text">POS</div>
                      </Link>
                    </li>

                    <li className="menu-item">
                      <Link
                        to="#"
                        onClick={handleLogout}
                        className="menu-item-button"
                      >
                        <div className="icon">
                          <IoLockOpenOutline size={22} />
                        </div>
                        <div className="text">Logout</div>
                      </Link>
                    </li>
                  </>
                )}

                {role === "manager" && (
                  <>
                    {hasFeature("staff_management") && (
                      <li className="menu-item">
                        <Link
                          to="/staff"
                          className={`menu-item-button ${isActive("/staff") ? "active" : ""}`}
                        >
                          <div className="icon">
                            <i className="icon-user"></i>
                          </div>
                          <div className="text">Cashiers</div>
                        </Link>
                      </li>
                    )}

                    <li className="menu-item">
                      <Link
                        to="/category"
                        className={`menu-item-button ${isActive("/category") ? "active" : ""}`}
                      >
                        <div className="icon">
                          <IoGridOutline size={22} />
                        </div>
                        <div className="text">Categories</div>
                      </Link>
                    </li>

                    {hasFeature("staff_management") && (
                      <li className="menu-item">
                        <Link
                          to="/brand"
                          className={`menu-item-button ${isActive("/brand") ? "active" : ""}`}
                        >
                          <div className="icon">
                            <IoPricetagsOutline size={22} />
                          </div>
                          <div className="text">Brands</div>
                        </Link>
                      </li>
                    )}

                    {hasFeature("gst_rates") && (
                      <li className="menu-item">
                        <Link
                          to="/gst-rates"
                          className={`menu-item-button ${isActive("/gst-rates") ? "active" : ""}`}
                          onClick={closeSidebar}
                        >
                          <div className="icon">
                            <IoWalletOutline size={22} />
                          </div>
                          <div className="text">GST Rates</div>
                        </Link>
                      </li>
                    )}

                    {sharedMenus}

                    <li className="menu-item">
                      <Link
                        to="/pos"
                        className={`menu-item-button ${isActive("/pos") ? "active" : ""}`}
                      >
                        <div className="icon">
                          <IoDesktopOutline size={22} />
                        </div>
                        <div className="text">POS</div>
                      </Link>
                    </li>

                    <li className="menu-item">
                      <Link
                        to="#"
                        onClick={handleLogout}
                        className="menu-item-button"
                      >
                        <div className="icon">
                          <IoLockOpenOutline size={22} />
                        </div>
                        <div className="text">Logout</div>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;

