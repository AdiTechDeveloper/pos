import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAppData } from "../context/AppDataContext";
import { hasFeature } from "../utils/hasFeature";

import { PiKeyReturnBold, PiWallet } from "react-icons/pi";

import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

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
  IoPeopleOutline,
} from "react-icons/io5";
import { FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const activeMenuRef = useRef(null);

  const user_detail = JSON.parse(localStorage.getItem("user_detail") || "null");

  const role = user_detail?.user?.role;
  const store_id = user_detail?.user?.store_id;

  const appData = useAppData();
  const store = appData?.store || null;

  const reportLinks = [
    {
      name: "Stock Summary",
      path: "/reports/stock-summary",
      feature: "reports_stock",
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
      feature: "price_override",
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
      feature: "reports_shift",
    },
    {
      name: "Stock Expiry",
      path: "/reports/stock-expiry-report",
      feature: "stock_alerts",
    },
    {
      name: "Supplier Tracking",
      path: "/supplier-tracking",
      feature: "reports_suplier",
    },
  ];

  const visibleReportLinks = reportLinks.filter(
    (item) => !item.feature || hasFeature(item.feature),
  );

  const isActive = (path) => location.pathname === path;

  const isReportPath = reportLinks.some(
    (item) => location.pathname === item.path,
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeMenuRef.current) {
        activeMenuRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, reportsOpen]);

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
        },
      );
    } catch (error) {
      console.error("Logout API error:", error);
    }

    // removeItem accepts only ONE key
    localStorage.removeItem("user_detail");
    localStorage.removeItem("cart_detail");
    localStorage.removeItem("cart_total");

    sessionStorage.clear();

    navigate("/");
  };

  const sharedMenuItems = [
    {
      name: "Categories",
      path: "/category",
      icon: <IoGridOutline size={20} />,
    },
    {
      name: "Brands",
      path: "/brand",
      icon: <IoPricetagsOutline size={20} />,
    },
    {
      name: "GST Rates",
      path: "/gst-rates",
      icon: <IoWalletOutline size={20} />,
      feature: "gst_rates",
    },
    {
      name: "Suppliers",
      path: "/suppliers",
      icon: <IoStorefrontOutline size={20} />,
      feature: "suppliers",
    },
    {
      name: "Products",
      path: "/product",
      icon: <IoCubeOutline size={20} />,
      feature: "products",
    },
    {
      name: "Print Barcode",
      path: "/print-barcode",
      icon: <IoPrintOutline size={20} />,
      feature: "products",
    },
    {
      name: "Expired Products",
      path: "/expired-products",
      icon: <IoExitOutline size={20} />,
      feature: "stock_alerts",
    },
    {
      name: "Purchase Bills",
      path: "/purchase-bill",
      icon: <IoReceiptOutline size={20} />,
      feature: "purchase_bills",
    },
    {
      name: "Purchase Return Bills",
      path: "/purchase-return-bill",
      icon: <PiKeyReturnBold size={20} />,
      feature: "purchase_returns",
    },
    {
      name: "Sales Bills",
      path: "/sale-bill",
      icon: <IoCartOutline size={20} />,
    },
    {
      name: "Sales Return",
      path: "/sales-return/list",
      icon: <PiKeyReturnBold size={20} />,
      feature: "sales_returns",
    },
    {
      name: "Advance Payment",
      path: "/advancepayment",
      icon: <PiWallet size={20} />,
      feature: "advance_payments",
    },
    {
      name: "Customers",
      path: "/customers",
      icon: <IoPeopleOutline size={20} />,
      feature: "customers",
    },
  ];

  /* =========================================================
      ROLE MENUS
  ========================================================= */

  const superadminMenus = [
    {
      name: "Stores",
      path: "/store",
      icon: <i className="icon-briefcase" />,
    },
  ];

  const posMenuItem = {
    name: "POS",
    path: "/pos",
    icon: <IoDesktopOutline size={20} />,
  };

  const adminMenus = [
    {
      name: "Know You Bussiness",
      path: "/ai-insights",
      icon: <Sparkles className="w-10 h-10" />,
      feature: "ai_insights",
    },
    {
      name: "Branches",
      path: "/branch",
      icon: <i className="icon-briefcase" />,
      feature: "branch_management",
    },
    {
      name: "Staff",
      path: "/staff",
      icon: <i className="icon-user" />,
      feature: "staff_management",
    },
    ...sharedMenuItems,
    posMenuItem,
  ];

  const managerMenus = [
    {
      name: "Know You Bussiness",
      path: "/ai-insights",
      icon: <Sparkles className="w-10 h-10" />,
      feature: "ai_insights",
    },
    {
      name: "Cashiers",
      path: "/staff",
      icon: <i className="icon-user" />,
      feature: "staff_management",
    },
    ...sharedMenuItems,
    posMenuItem,
  ];

  const getMenuList = () => {
    let list = [];

    if (role === "superadmin") list = superadminMenus;
    else if (role === "admin") list = adminMenus;
    else if (role === "manager") list = managerMenus;

    return list.filter((item) => !item.feature || hasFeature(item.feature));
  };

  const menuList = getMenuList();
  const posItem = menuList.find((item) => item.path === "/pos");
  const mainItems = menuList.filter((item) => item.path !== "/pos");

  const isBackOffice = role === "admin" || role === "manager";
  const showReports = isBackOffice && visibleReportLinks.length > 0;

  /* =========================================================
      RENDER
  ========================================================= */

  const renderMenuItem = (item) => (
    <li key={`${item.path}-${item.name}`} className="app-sidebar-menu-item">
      <Link
        ref={isActive(item.path) ? activeMenuRef : null}
        to={item.path}
        className={`app-sidebar-link ${isActive(item.path) ? "active" : ""}`}
        onClick={closeSidebar}
        title={isCollapsed ? item.name : undefined}
      >
        <span className="app-sidebar-link-icon">{item.icon}</span>
        <span className="app-sidebar-link-text">{item.name}</span>
      </Link>
    </li>
  );

  return (
    <>
      {/* MOBILE MENU BUTTON */}
      <button
        className="app-sidebar-mobile-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="icon-menu-left"></span>
      </button>

      {/* SIDEBAR CSS */}
      <style>{`
        /* ---------- MAIN SIDEBAR ---------- */
        .app-sidebar {
          width: 280px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          background: #ffffff;
          border-right: 1px solid #edf0f5;
          display: flex;
          flex-direction: column;
          z-index: 999;
          transition: width 0.25s ease, transform 0.25s ease;
          box-sizing: border-box;
        }

        .app-sidebar.collapsed {
          width: 78px;
        }

        /* ---------- HEADER ---------- */
        .app-sidebar-header {
          height: 92px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          border-bottom: 1px solid #f1f3f6;
          flex-shrink: 0;
        }

        .app-sidebar-logo {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .app-sidebar-logo img {
          max-width: 180px;
          /* max-height: 55px; */
          object-fit: contain;
          display: block;
          transition: all 0.25s ease;
        }

        .app-sidebar.collapsed .app-sidebar-logo img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        /* ---------- COLLAPSE BUTTON ---------- */
        .app-sidebar-collapse-btn {
          width: 34px;
          height: 34px;
          border: 0;
          background: transparent;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .app-sidebar-collapse-btn:hover {
          background: #f1f5f9;
          color: #2563eb;
        }

        /* ---------- SIDEBAR BODY ---------- */
        .app-sidebar-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px 10px 30px;
        }

        .app-sidebar-body::-webkit-scrollbar {
          width: 5px;
        }

        .app-sidebar-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .app-sidebar-body::-webkit-scrollbar-thumb {
          background: #d8dee8;
          border-radius: 10px;
        }

        /* ---------- SECTION HEADING ---------- */
        .app-sidebar-section-title {
          font-size: 11px;
          line-height: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: #a3adbd;
          padding: 14px 14px 7px;
          margin-top: 3px;
        }

        .app-sidebar.collapsed .app-sidebar-section-title {
          display: none;
        }

        /* ---------- MENU LIST ---------- */
        .app-sidebar-menu {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .app-sidebar-menu-item {
          position: relative;
          margin: 3px 0;
        }

        /* ---------- MENU LINK ---------- */
        .app-sidebar-link {
          position: relative;
          min-height: 46px;
          width: 100%;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #111827;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
          box-sizing: border-box;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        /* ---------- ICON ---------- */
        .app-sidebar-link-icon {
          width: 22px;
          min-width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          transition: color 0.2s ease;
        }

        .app-sidebar-link-icon svg {
          stroke-width: 1.8;
        }

        .app-sidebar-link-icon i {
          font-size: 19px;
        }

        /* ---------- TEXT ---------- */
        .app-sidebar-link-text {
          /* flex: 1; */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ---------- HOVER ---------- */
        .app-sidebar-link:hover {
          background: #f7f9fc;
          color: #111827;
          text-decoration: none;
        }

        .app-sidebar-link:hover .app-sidebar-link-icon {
          color: #2563eb;
        }

        /* ---------- ACTIVE ITEM ---------- */
        .app-sidebar-link.active {
          background: #eaf2ff;
          color: #2563eb;
          font-weight: 600;
        }

        .app-sidebar-link.active .app-sidebar-link-icon {
          color: #2563eb;
        }

        .app-sidebar-link.active::before {
          content: "";
          position: absolute;
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 34px;
          background: #2878f0;
          border-radius: 0 5px 5px 0;
        }

        /* ---------- CHEVRON ---------- */
        .app-sidebar-chevron {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          flex-shrink: 0;
        }

        /* ---------- COLLAPSED MENU ---------- */
        .app-sidebar.collapsed .app-sidebar-link {
          justify-content: center;
          padding: 0;
          gap: 0;
        }

        .app-sidebar.collapsed .app-sidebar-link-text,
        .app-sidebar.collapsed .app-sidebar-chevron {
          display: none;
        }

        .app-sidebar.collapsed .app-sidebar-link.active::before {
          left: -10px;
        }

        /* ---------- REPORT SUBMENU ---------- */
        .app-sidebar-submenu {
          list-style: none;
          margin: 2px 0 8px;
          padding: 2px 0 2px 38px;
        }

        .app-sidebar-submenu-item {
          position: relative;
          margin: 1px 0;
        }

        .app-sidebar-submenu-link {
          position: relative;
          min-height: 34px;
          display: flex;
          align-items: center;
          padding: 6px 10px 6px 14px;
          border-radius: 7px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .app-sidebar-submenu-link::before {
          content: "";
          position: absolute;
          left: 0;
          width: 5px;
          height: 5px;
          border: 1px solid #b9c3d1;
          transform: rotate(45deg);
        }

        .app-sidebar-submenu-link:hover {
          background: #f7f9fc;
          color: #2563eb;
        }

        .app-sidebar-submenu-link.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 600;
        }

        .app-sidebar-submenu-link.active::before {
          border-color: #2563eb;
          background: #2563eb;
        }

        .app-sidebar.collapsed .app-sidebar-submenu {
          display: none !important;
        }

        /* ---------- MOBILE BUTTON ---------- */
        .app-sidebar-mobile-btn {
          display: none;
          position: fixed;
          top: 15px;
          left: 15px;
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 8px;
          background: #2563eb;
          color: #ffffff;
          z-index: 1100;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }

        /* ---------- MOBILE ---------- */
        @media (max-width: 768px) {
          .app-sidebar {
            width: 280px;
            transform: translateX(-100%);
            box-shadow: 5px 0 25px rgba(15, 23, 42, 0.12);
          }

          .app-sidebar.open {
            transform: translateX(0);
          }

          .app-sidebar.collapsed {
            width: 280px;
          }

          .app-sidebar-mobile-btn {
            display: flex;
          }

          .app-sidebar-collapse-btn {
            display: none;
          }

          .app-sidebar.collapsed .app-sidebar-link-text,
          .app-sidebar.collapsed .app-sidebar-chevron {
            display: block;
          }

          .app-sidebar.collapsed .app-sidebar-link {
            justify-content: flex-start;
            padding: 0 14px;
            gap: 13px;
          }

          .app-sidebar.collapsed .app-sidebar-section-title {
            display: block;
          }

          .app-sidebar.collapsed .app-sidebar-submenu {
            display: block !important;
          }
        }

        /* ---------- SUPPORT SECTION ---------- */
        .app-sidebar-support {
          margin-top: 8px;
        }

        .app-sidebar-support .support-title {
          margin-top: 8px;
          margin-bottom: 4px;
        }

        /* ---------- SOCIAL ICONS ---------- */
        .app-sidebar-social {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px 20px;
        }

        .app-sidebar-social-btn {
          width: 44px;
          height: 44px;
          border: 1px solid #edf0f5;
          border-radius: 11px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b3bdcc;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .app-sidebar-social-btn svg {
          width: 17px;
          height: 17px;
        }

        .app-sidebar-social-btn:hover {
          border-color: #2878f0;
          color: #2878f0;
          background: #f7faff;
          transform: translateY(-2px);
        }

        /* ---------- CONTACT CARD ---------- */
        .app-sidebar-contact-card {
          margin: 28px 0 10px;
          padding: 16px;
          border: 1px solid #edf0f5;
          border-radius: 14px;
          background: #ffffff;
          text-align: center;
          box-sizing: border-box;
        }

        .app-sidebar-avatar {
          width: 100%;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .app-sidebar-avatar img {
          width: 233px;
          height: 184px;
          object-fit: cover;
          display: block;
        }

        .app-sidebar-contact-card h3 {
          margin: 6px 0 8px;
          font-size: 18px;
          line-height: 26px;
          font-weight: 700;
          color: #111827;
        }

        .app-sidebar-contact-card p {
          margin: 0 0 18px;
          font-size: 13px;
          line-height: 18px;
          color: #64748b;
        }

        .app-sidebar-contact-btn {
          width: 100%;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          border-radius: 12px;
          background: #2878f0;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .app-sidebar-contact-btn:hover {
          background: #1768df;
          color: #ffffff;
          text-decoration: none;
          transform: translateY(-1px);
        }
      `}</style>

      {/* SIDEBAR */}
      <aside
        className={`app-sidebar ${isOpen ? "open" : ""} ${
          isCollapsed ? "collapsed" : ""
        }`}
      >
        {/* HEADER */}
        <div className="app-sidebar-header">
          <div className="app-sidebar-logo">
            <Link to="/dashboard" onClick={closeSidebar}>
              {logoUrl && <img src={logoUrl} alt="logo" />}
            </Link>
          </div>
        </div>

        {/* BODY */}
        <div className="app-sidebar-body">
          <div className="app-sidebar-section-title">Main Home</div>
          <ul className="app-sidebar-menu">
            <li className="app-sidebar-menu-item">
              <Link
                to="/dashboard"
                className={`app-sidebar-link ${
                  isActive("/dashboard") ? "active" : ""
                }`}
                onClick={closeSidebar}
                title={isCollapsed ? "Dashboard" : undefined}
              >
                <span className="app-sidebar-link-icon">
                  <IoHomeOutline size={20} />
                </span>
                <span className="app-sidebar-link-text">Dashboard</span>
              </Link>
            </li>
          </ul>

          <div className="app-sidebar-section-title">All Page</div>
          <ul className="app-sidebar-menu">
            {/* feature-filtered menu items (POS ko chhodkar) */}
            {mainItems.map(renderMenuItem)}

            {showReports && (
              <li className="app-sidebar-menu-item">
                <button
                  type="button"
                  className={`app-sidebar-link ${isReportPath ? "active" : ""}`}
                  style={{ fontFamily: "inherit", textAlign: "left" }}
                  onClick={() => setReportsOpen((prev) => !prev)}
                  title={isCollapsed ? "Reports" : undefined}
                >
                  <span className="app-sidebar-link-icon">
                    <IoBarChartOutline size={20} />
                  </span>
                  <span className="app-sidebar-link-text">Reports</span>
                  <span
                    className="app-sidebar-chevron"
                    style={{ marginLeft: "auto" }}
                  >
                    {reportsOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                </button>

                {reportsOpen && (
                  <ul className="app-sidebar-submenu">
                    {visibleReportLinks.map((item) => (
                      <li key={item.path} className="app-sidebar-submenu-item">
                        <Link
                          ref={isActive(item.path) ? activeMenuRef : null}
                          to={item.path}
                          className={`app-sidebar-submenu-link ${
                            isActive(item.path) ? "active" : ""
                          }`}
                          onClick={closeSidebar}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            {posItem && renderMenuItem(posItem)}

            {isBackOffice && (
              <li className="app-sidebar-menu-item">
                <button
                  type="button"
                  className="app-sidebar-link"
                  style={{ fontFamily: "inherit", textAlign: "left" }}
                  onClick={handleLogout}
                  title={isCollapsed ? "Logout" : undefined}
                >
                  <span className="app-sidebar-link-icon">
                    <IoLockOpenOutline size={20} />
                  </span>
                  <span className="app-sidebar-link-text">Logout</span>
                </button>
              </li>
            )}
          </ul>

          {/* SUPPORT SECTION */}
          <div className="app-sidebar-support">
            {!isCollapsed && (
              <div className="app-sidebar-support">
                <div className="app-sidebar-section-title support-title">
                  Connect Us
                </div>

                <div className="app-sidebar-social">
                  <a
                    href="https://www.facebook.com/vakarosoftware"
                    target="_blank"
                    className="app-sidebar-social-btn"
                    aria-label="Facebook"
                    target="_blank"
                  >
                    <FaFacebookF />
                  </a>

                  <a
                    href="https://www.linkedin.com/company/vakaroofficial/"
                    target="_blank"
                    className="app-sidebar-social-btn"
                    aria-label="LinkedIn"
                    target="_blank"
                  >
                    <FaLinkedinIn />
                  </a>

                  <a
                    href="https://www.instagram.com/vakaro_official/"
                    target="_blank"
                    className="app-sidebar-social-btn"
                    aria-label="Instagram"
                    target="_blank"
                  >
                    <FaInstagram />
                  </a>
                </div>

                <div className="app-sidebar-contact-card">
                  {/* AVATAR */}
                  <div className="app-sidebar-avatar">
                    <img
                      src="/assets/images/avatar/avatar.png"
                      alt="Contact Support"
                    />
                  </div>

                  {/* TITLE */}
                  <h3>Hi, how can we help?</h3>

                  {/* DESCRIPTION */}
                  <p>
                    Contact us if you have any
                    <br />
                    assistance, we will contact you as
                    <br />
                    soon as possible
                  </p>

                  {/* BUTTON */}
                  <a
                    style={{ color: "white", textDecoration: "none" }}
                    href="https://vakaro.in/contact"
                    className="app-sidebar-contact-btn"
                    onClick={closeSidebar}
                    target="_blank"
                  >
                    Contact
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
