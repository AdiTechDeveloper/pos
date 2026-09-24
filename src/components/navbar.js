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

  /* =========================================================
      SHARED MENU
  ========================================================= */

  const sharedMenuItems = [
    {
      name: "Suppliers",
      path: "/suppliers",
      icon: <IoStorefrontOutline size={20} />,
    },
    {
      name: "Products",
      path: "/product",
      icon: <IoCubeOutline size={20} />,
    },
    {
      name: "Print Barcode",
      path: "/print-barcode",
      icon: <IoPrintOutline size={20} />,
    },
    {
      name: "Expired Products",
      path: "/expired-products",
      icon: <IoExitOutline size={20} />,
    },
    {
      name: "Purchase Bills",
      path: "/purchase-bill",
      icon: <IoReceiptOutline size={20} />,
    },
    {
      name: "Purchase Return Bills",
      path: "/purchase-return-bill",
      icon: <PiKeyReturnBold size={20} />,
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
    },
    {
      name: "Advance Payment",
      path: "/advancepayment",
      icon: <PiWallet size={20} />,
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

  const adminMenus = [
    {
      name: "Branches",
      path: "/branch",
      icon: <i className="icon-briefcase" />,
    },
    {
      name: "Staff",
      path: "/staff",
      icon: <i className="icon-user" />,
    },

    ...sharedMenuItems,
  ];

  const managerMenus = [
    {
      name: "Cashiers",
      path: "/staff",
      icon: <i className="icon-user" />,
    },
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
    },

    ...sharedMenuItems,

    {
      name: "POS",
      path: "/pos",
      icon: <IoDesktopOutline size={20} />,
    },


  ];

  const getMenuList = () => {
    if (role === "superadmin") {
      return superadminMenus;
    }

    if (role === "admin") {
      return adminMenus;
    }

    if (role === "manager") {
      return managerMenus;
    }

    return [];
  };

  /* =========================================================
      RENDER
  ========================================================= */

  return (
    <>
      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      <button
        className="app-sidebar-mobile-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="icon-menu-left"></span>
      </button>

      {/* =====================================================
          SIDEBAR CSS
      ===================================================== */}

      <style>{`

        /* ==============================================
           MAIN SIDEBAR
        ============================================== */

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

          transition:
            width 0.25s ease,
            transform 0.25s ease;

          box-sizing: border-box;
        }


        /* ==============================================
           COLLAPSED
        ============================================== */

        .app-sidebar.collapsed {
          width: 78px;
        }


        /* ==============================================
           HEADER
        ============================================== */

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
          // max-height: 55px;

          object-fit: contain;

          display: block;

          transition: all 0.25s ease;
        }


        .app-sidebar.collapsed .app-sidebar-logo img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }


        /* ==============================================
           COLLAPSE BUTTON
        ============================================== */

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


        /* ==============================================
           SIDEBAR BODY
        ============================================== */

        .app-sidebar-body {
          flex: 1;

          overflow-y: auto;
          overflow-x: hidden;

          padding: 16px 10px 30px;
        }


        /* Scrollbar */

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


        /* ==============================================
           SECTION HEADING
        ============================================== */

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


        /* ==============================================
           MENU LIST
        ============================================== */

        .app-sidebar-menu {
          list-style: none;

          margin: 0;
          padding: 0;
        }


        .app-sidebar-menu-item {
          position: relative;

          margin: 3px 0;
        }


        /* ==============================================
           MENU LINK
        ============================================== */

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

          transition:
            background 0.2s ease,
            color 0.2s ease;
        }


        /* ==============================================
           ICON
        ============================================== */

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


        /* ==============================================
           TEXT
        ============================================== */

        .app-sidebar-link-text {
          // flex: 1;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }


        /* ==============================================
           HOVER
        ============================================== */

        .app-sidebar-link:hover {
          background: #f7f9fc;

          color: #111827;

          text-decoration: none;
        }


        .app-sidebar-link:hover
        .app-sidebar-link-icon {
          color: #2563eb;
        }


        /* ==============================================
           ACTIVE ITEM
        ============================================== */

        .app-sidebar-link.active {
          background: #eaf2ff;

          color: #2563eb;

          font-weight: 600;
        }


        .app-sidebar-link.active
        .app-sidebar-link-icon {
          color: #2563eb;
        }


        /* Left blue line like screenshot */

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


        /* ==============================================
           CHEVRON
        ============================================== */

        .app-sidebar-chevron {
          width: 18px;
          height: 18px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #111827;

          flex-shrink: 0;
        }


        /* ==============================================
           COLLAPSED MENU
        ============================================== */

        .app-sidebar.collapsed
        .app-sidebar-link {
          justify-content: center;

          padding: 0;

          gap: 0;
        }


        .app-sidebar.collapsed
        .app-sidebar-link-text,

        .app-sidebar.collapsed
        .app-sidebar-chevron {
          display: none;
        }


        .app-sidebar.collapsed
        .app-sidebar-link.active::before {
          left: -10px;
        }


        /* ==============================================
           REPORT SUBMENU
        ============================================== */

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


        /* Small diamond like screenshot */

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


        /* ==============================================
           COLLAPSED SUBMENU
        ============================================== */

        .app-sidebar.collapsed
        .app-sidebar-submenu {
          display: none !important;
        }


        /* ==============================================
           MOBILE BUTTON
        ============================================== */

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


        /* ==============================================
           MOBILE
        ============================================== */

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


          .app-sidebar.collapsed
          .app-sidebar-link-text,

          .app-sidebar.collapsed
          .app-sidebar-chevron {
            display: block;
          }


          .app-sidebar.collapsed
          .app-sidebar-link {
            justify-content: flex-start;

            padding: 0 14px;

            gap: 13px;
          }


          .app-sidebar.collapsed
          .app-sidebar-section-title {
            display: block;
          }


          .app-sidebar.collapsed
          .app-sidebar-submenu {
            display: block !important;
          }

        }
        
        /* ==============================================
   SUPPORT SECTION
============================================== */

.app-sidebar-support {
  margin-top: 8px;
}

.app-sidebar-support .support-title {
  margin-top: 8px;
  margin-bottom: 4px;
}


/* ==============================================
   SOCIAL ICONS
============================================== */

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


/* ==============================================
   CONTACT CARD
============================================== */

.app-sidebar-contact-card {
  margin: 28px 0 10px;

  padding: 16px;

  border: 1px solid #edf0f5;

  border-radius: 14px;

  background: #ffffff;

  text-align: center;

  box-sizing: border-box;
}


/* ==============================================
   AVATAR
============================================== */

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


/* ==============================================
   CONTACT TITLE
============================================== */

.app-sidebar-contact-card h3 {
  margin: 6px 0 8px;

  font-size: 18px;
  line-height: 26px;

  font-weight: 700;

  color: #111827;
}


/* ==============================================
   CONTACT DESCRIPTION
============================================== */

.app-sidebar-contact-card p {
  margin: 0 0 18px;

  font-size: 13px;
  line-height: 18px;

  color: #64748b;
}


/* ==============================================
   CONTACT BUTTON
============================================== */

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


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          app-sidebar
          ${isOpen ? "open" : ""}
          ${isCollapsed ? "collapsed" : ""}
        `}
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="app-sidebar-header">

          <div className="app-sidebar-logo">

            <Link to="/dashboard" onClick={closeSidebar}>

              <img
                src={encodeURI(logoUrl)}
                alt="Logo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

            </Link>

          </div>


          {/* Collapse */}

          {/* <button
            type="button"
            className="app-sidebar-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={
              isCollapsed
                ? "Expand Sidebar"
                : "Collapse Sidebar"
            }
          >

            {isCollapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}

          </button> */}

        </div>


        {/* ===================================================
            BODY
        =================================================== */}

        <div className="app-sidebar-body">

          {/* =================================================
              MAIN HOME
          ================================================= */}

          <div className="app-sidebar-section-title">
            Main Home
          </div>


          <ul className="app-sidebar-menu">

            <li className="app-sidebar-menu-item">

              <Link
                to="/dashboard"
                onClick={closeSidebar}
                className={`
                  app-sidebar-link
                  ${isActive("/dashboard") ? "active" : ""}
                `}
                title="Dashboard"
              >

                <span className="app-sidebar-link-icon">
                  <IoHomeOutline size={20} />
                </span>


                {!isCollapsed && (
                  <span className="app-sidebar-link-text">
                    Dashboard
                  </span>
                )}

              </Link>

            </li>

          </ul>


          {/* =================================================
              ALL PAGE
          ================================================= */}

          <div className="app-sidebar-section-title">
            All Page
          </div>


          <ul className="app-sidebar-menu">

            {/* ===============================================
                ROLE BASED MENUS
            =============================================== */}

            {getMenuList().map((item, index) => {

              const active = isActive(item.path);

              return (
                <li
                  key={index}
                  className="app-sidebar-menu-item"
                >

                  <Link
                    to={item.path}
                    title={item.name}
                    className={`
                      app-sidebar-link
                      ${active ? "active" : ""}
                    `}
                    onClick={(e) => {

                      if (item.onClick) {

                        e.preventDefault();

                        item.onClick();

                      } else {

                        closeSidebar();

                      }

                    }}
                  >

                    <span className="app-sidebar-link-icon">
                      {item.icon}
                    </span>


                    {!isCollapsed && (
                      <span className="app-sidebar-link-text">
                        {item.name}
                      </span>
                    )}

                  </Link>

                </li>
              );

            })}


            {/* =============================================
                REPORTS
            ============================================= */}

            {role !== "superadmin" && (

              <li className="app-sidebar-menu-item">

                <button
                  type="button"
                  className={`
                    app-sidebar-link
                    ${isReportPath ? "active" : ""}
                  `}
                  onClick={() => {

                    if (isCollapsed) {
                      setIsCollapsed(false);
                    }

                    setReportsOpen((prev) => !prev);

                  }}
                  title="Reports"
                >

                  <span className="app-sidebar-link-icon">
                    <IoBarChartOutline size={20} />
                  </span>


                  {!isCollapsed && (
                    <>

                      <span className="app-sidebar-link-text">
                        Reports
                      </span>


                      <span className="app-sidebar-chevron">

                        {reportsOpen ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}

                      </span>

                    </>
                  )}

                </button>


                {/* REPORT SUBMENU */}

                {!isCollapsed && reportsOpen && (

                  <ul className="app-sidebar-submenu">

                    {reportLinks.map((report, index) => (

                      <li
                        key={index}
                        className="app-sidebar-submenu-item"
                      >

                        <Link
                          to={report.path}
                          onClick={closeSidebar}
                          className={`
                            app-sidebar-submenu-link
                            ${isActive(report.path)
                              ? "active"
                              : ""
                            }
                          `}
                        >

                          {report.name}

                        </Link>

                      </li>

                    ))}

                  </ul>

                )}

              </li>

            )}

          </ul>


          {/* =================================================
              SETTINGS SECTION
          ================================================= */}

          {/* <div className="app-sidebar-section-title">
            Setting
          </div> */}
          {/* <ul className="app-sidebar-menu">

            

            <li className="app-sidebar-menu-item">

              <Link
                to="/location"
                onClick={closeSidebar}
                className={`
                  app-sidebar-link
                  ${isActive("/location") ? "active" : ""}
                `}
              >

                <span className="app-sidebar-link-icon">
                  <IoStorefrontOutline size={20} />
                </span>


                {!isCollapsed && (
                  <span className="app-sidebar-link-text">
                    Location
                  </span>
                )}

              </Link>

            </li>


          

            <li className="app-sidebar-menu-item">

              <Link
                to="/setting"
                onClick={closeSidebar}
                className={`
                  app-sidebar-link
                  ${isActive("/setting") ? "active" : ""}
                `}
              >

                <span className="app-sidebar-link-icon">
                  <IoGridOutline size={20} />
                </span>


                {!isCollapsed && (
                  <span className="app-sidebar-link-text">
                    Setting
                  </span>
                )}

              </Link>

            </li>

            <li className="app-sidebar-menu-item">

              <Link
                to="/pages"
                onClick={closeSidebar}
                className={`
                  app-sidebar-link
                  ${isActive("/pages") ? "active" : ""}
                `}
              >

                <span className="app-sidebar-link-icon">
                  <IoReceiptOutline size={20} />
                </span>


                {!isCollapsed && (
                  <span className="app-sidebar-link-text">
                    Pages
                  </span>
                )}

              </Link>

            </li>

          </ul> */}

           {/* =================================================
    SUPPORT SECTION
================================================= */}

      {!isCollapsed && (
        <div className="app-sidebar-support">

          
          {/* <div className="app-sidebar-section-title support-title">
            Support
          </div> */}

          {/* <ul className="app-sidebar-menu">

            
            <li className="app-sidebar-menu-item">
              <a
                href="/help-center"
                className="app-sidebar-link"
                onClick={closeSidebar}
              >
                <span className="app-sidebar-link-icon">
                  <FiHelpCircle size={20} />
                </span>

                <span className="app-sidebar-link-text">
                  Help Center
                </span>
              </a>
            </li>

         
            <li className="app-sidebar-menu-item">
              <a
                href="/faqs"
                className="app-sidebar-link"
                onClick={closeSidebar}
              >
                <span className="app-sidebar-link-icon">
                  <FiHeadphones size={20} />
                </span>

                <span className="app-sidebar-link-text">
                  FAQs
                </span>
              </a>
            </li>

        
            <li className="app-sidebar-menu-item">
              <a
                href="/privacy-policy"
                className="app-sidebar-link"
                onClick={closeSidebar}
              >
                <span className="app-sidebar-link-icon">
                  <FiFileText size={20} />
                </span>

                <span className="app-sidebar-link-text">
                  Privacy Policy
                </span>
              </a>
            </li>

          </ul> */}


          {/* =================================================
        CONNECT US
           ================================================= */}

          <div className="app-sidebar-section-title support-title">
            Connect Us
          </div>

          <div className="app-sidebar-social">

            <a
              href="https://www.facebook.com/vakarosoftware"
              className="app-sidebar-social-btn"
              aria-label="Facebook"
            >
              <FaFacebookF />
            </a>

            <a
              href="https://www.linkedin.com/company/vakaroofficial/"
              className="app-sidebar-social-btn"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn />
            </a>

            <a
              href="https://www.instagram.com/vakaro_official/"
              className="app-sidebar-social-btn"
              aria-label="Instagram"
            >
              <FaInstagram />
            </a>

          </div>


          {/* =================================================
        CONTACT US CARD
    ================================================= */}

          <div className="app-sidebar-contact-card">

            {/* AVATAR */}
            <div className="app-sidebar-avatar">
              <img
                src="/assets/images/avatar/avatar.png"
                alt="Contact Support"
              />
            </div>

            {/* TITLE */}
            <h3>
              Hi, how can we help?
            </h3>

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

      </aside>

     
    </>
  );
};

export default Navbar;

