import React, { useState, useEffect } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import axios from "axios";
import { useAppData } from "../context/AppDataContext";
import { PiKeyReturnBold, PiWallet } from "react-icons/pi";
import { ChevronDown, ChevronUp, Menu } from "lucide-react";
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

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Navbar = () => {
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const user_detail = JSON.parse(localStorage.getItem("user_detail"));
  const role = user_detail?.user?.role;
  const store_id = user_detail?.user?.store_id;

  const appData = useAppData();
  const store = appData?.store || null;

  const location = useLocation();

  const reportLinks = [
    { name: "Stock Summary", path: "/reports/stock-summary" },
    { name: "Purchase Summary", path: "/reports/purchase-summary" },
    { name: "Sales Analytics", path: "/reports/sales-analytics" },
    { name: "GST Output", path: "/reports/gst-output-sales" },
    { name: "GSTR - 3B", path: "/reports/GSTR3B" },
    { name: "GSTR1 Summary", path: "/reports/GSTR1-Summary" },
    { name: "Price Override Summary", path: "/reports/price-override" },
    { name: "Sales Report", path: "/reports/sales-report" },
    { name: "Purchase Report", path: "/reports/purchase-report" },
    { name: "Financial Report", path: "/reports/financial-report" },
    { name: "Shift History Report", path: "/reports/shift-report" },
    { name: "Stock Expiry", path: "/reports/stock-expiry-report" },
  ];

  const reportPaths = reportLinks.map((item) => item.path);
  const isReportPath = reportPaths.includes(location.pathname);
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    if (store_id) appData?.loadStore(store_id);
  }, [store_id, appData]);

  useEffect(() => {
    if (isReportPath) {
      setReportsOpen(true);
    }
  }, [isReportPath]);

  const DEFAULT_LOGO = "/assets/images/logo/vakaro-full.png";

  const logoUrl =
    role === "superadmin" || !store?.logo
      ? DEFAULT_LOGO
      : `${BASE_URL}/storage/${store.logo}`;

  const closeSidebar = () => {
    if (window.innerWidth <= 768) setIsOpen(false);
  };

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

    localStorage.removeItem("user_detail", "cart_detail", "cart_detail");
    sessionStorage.clear();
    history.push("/");
  };

  // Shared menu items list for Admin & Manager
  const sharedMenuItems = [
    { name: "Suppliers", path: "/suppliers", icon: <IoStorefrontOutline size={20} /> },
    { name: "Products", path: "/product", icon: <IoCubeOutline size={20} /> },
    { name: "Print Barcode", path: "/print-barcode", icon: <IoPrintOutline size={20} /> },
    { name: "Expired Products", path: "/expired-products", icon: <IoExitOutline size={20} /> },
    { name: "Purchase Bills", path: "/purchase-bill", icon: <IoReceiptOutline size={20} /> },
    { name: "Purchase Return Bills", path: "/purchase-return-bill", icon: <PiKeyReturnBold size={20} /> },
    { name: "Sales Bills", path: "/sale-bill", icon: <IoCartOutline size={20} /> },
    { name: "Sales Return", path: "/sales-return/list", icon: <PiKeyReturnBold size={20} /> },
    { name: "Advance Payment", path: "/advancepayment", icon: <PiWallet size={20} /> },
  ];

  // Role-specific unique menu arrays
  const superadminMenus = [
    { name: "Stores", path: "/store", icon: <i className="icon-briefcase" style={{ fontSize: "18px" }}></i> },
  ];

  const adminMenus = [
    { name: "Branches", path: "/branch", icon: <i className="icon-briefcase" style={{ fontSize: "18px" }}></i> },
    { name: "Staff", path: "/staff", icon: <i className="icon-user" style={{ fontSize: "18px" }}></i> },
    ...sharedMenuItems,
  ];

  const managerMenus = [
    { name: "Cashiers", path: "/staff", icon: <i className="icon-user" style={{ fontSize: "18px" }}></i> },
    { name: "Categories", path: "/category", icon: <IoGridOutline size={20} /> },
    { name: "Brands", path: "/brand", icon: <IoPricetagsOutline size={20} /> },
    { name: "GST Rates", path: "/gst-rates", icon: <IoWalletOutline size={20} /> },
    ...sharedMenuItems,
    { name: "POS", path: "/pos", icon: <IoDesktopOutline size={20} /> },
    { name: "Logout", path: "#", icon: <IoLockOpenOutline size={20} />, onClick: handleLogout },
  ];

  // Pick menus based on role
  const getMenuList = () => {
    if (role === "superadmin") return superadminMenus;
    if (role === "admin") return adminMenus;
    if (role === "manager") return managerMenus;
    return [];
  };

  return (
    <>
      {/* Mobile Button */}
      <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        <i className="icon-menu-left"></i>
      </button>

      {/* Custom Styles for Pill Active State & Collapse Behavior */}
      <style>{`
        .section-menu-left {
          width: 260px;
          transition: width 0.25s ease-in-out;
          background: #ffffff;
          box-shadow: 2px 0 8px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          z-index: 100;
        }
        .section-menu-left.collapsed {
          width: 76px !important;
        }
        
        .section-menu-left .menu-item-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          margin: 4px 12px;
          border-radius: 10px;
          color: #4b5563;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .section-menu-left.collapsed .menu-item-button {
          justify-content: center;
          margin: 4px 8px;
          padding: 10px;
        }

        .section-menu-left .menu-item-button:hover {
          background-color: #f3f4f6;
          color: #1f2937;
        }

        /* Pill Active State */
        .section-menu-left .menu-item-button.active {
          background-color: #eff6ff !important;
          color: #2563eb !important;
          font-weight: 600;
        }
        .section-menu-left .menu-item-button.active svg,
        .section-menu-left .menu-item-button.active i {
          color: #2563eb !important;
        }

        .sub-menu-item a.active-sub {
          color: #2563eb !important;
          font-weight: 600;
          background-color: #eff6ff;
          border-radius: 6px;
        }

        .section-menu-left .center-heading {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          padding: 16px 20px 6px 20px;
          font-weight: 600;
        }
        .section-menu-left.collapsed .center-heading {
          display: none;
        }
        .section-menu-left.collapsed .box-logo img {
          height: 35px !important;
          margin-left: 0 !important;
        }
        .section-menu-left.collapsed .box-logo {
          text-align: center;
          padding: 15px 0;
        }
      `}</style>

    
      <div className={`section-menu-left ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        
        {/* Top Header Row with Logo & Collapse Toggle Button */}
       <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 0 12px" }}>
  <div className="box-logo" >
    <Link to="/dashboard" onClick={closeSidebar}>
      {logoUrl ? (
        <img
          src={encodeURI(logoUrl)}
          alt="logo"
          style={{ height: "50px", objectFit: "contain", transition: "all 0.2s" }}
          onLoad={() => console.log("✅ Logo loaded successfully:", logoUrl)}
          onError={(e) => {
            console.error("❌ Logo failed to load (404/Not Found):", encodeURI(logoUrl));
            // Hides the broken image element if it fails
          
          }}
        />
      ) : (
        <div style={{ height: "50px", display: "flex", alignItems: "center" }}>
          {/* Optional placeholder while logoUrl is being fetched */}
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Loading...</span>
        </div>
      )}
    </Link>
  </div>

  <button
    onClick={() => setIsCollapsed(!isCollapsed)}
    style={{
      background: "#f3f4f6",
      border: "none",
      borderRadius: "8px",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: "#4b5563",
      transition: "background 0.2s",
      flexShrink: 0,
    }}
    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
  >
    <Menu size={18} />
  </button>
</div>
        

        <div className="section-menu-left-wrap" style={{ overflowY: "auto", flex: 1, paddingBottom: "20px" }}>
          <div className="center">
            {/* Main Home Section */}
            <div className="center-item">
              <div className="center-heading">Main Home</div>
              <ul className="menu-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li className="menu-item">
                  <Link
                    to="/dashboard"
                    className={`menu-item-button ${isActive("/dashboard") ? "active" : ""}`}
                    onClick={closeSidebar}
                    title="Dashboard"
                  >
                    <div className="icon">
                      <IoHomeOutline size={20} />
                    </div>
                    {!isCollapsed && <div className="text">Dashboard</div>}
                  </Link>
                </li>
              </ul>
            </div>

            {/* All Pages Section (Rendered via Loop) */}
            <div className="center-item">
              <div className="center-heading">All Page</div>
              <ul className="menu-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {getMenuList().map((item, index) => (
                  <li key={index} className="menu-item">
                    <Link
                      to={item.path}
                      className={`menu-item-button ${isActive(item.path) ? "active" : ""}`}
                      onClick={(e) => {
                        if (item.onClick) {
                          e.preventDefault();
                          item.onClick();
                        } else {
                          closeSidebar();
                        }
                      }}
                      title={item.name}
                    >
                      <div className="icon">{item.icon}</div>
                      {!isCollapsed && <div className="text">{item.name}</div>}
                    </Link>
                  </li>
                ))}

                {/* Reports Dropdown Loop (for Admin/Manager roles) */}
                {role !== "superadmin" && (
                  <li className={`menu-item has-children ${reportsOpen ? "active-parent" : ""}`}>
                    <a
                      href="#toggle-reports"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isCollapsed) setIsCollapsed(false);
                        setReportsOpen((prev) => !prev);
                      }}
                      className="menu-item-button"
                      style={{ display: "flex", alignItems: "center", width: "100%" }}
                      title="Reports"
                    >
                      <div className="icon" style={{ display: "flex", alignItems: "center" }}>
                        <IoBarChartOutline size={20} />
                      </div>
                      {!isCollapsed && (
                        <>
                          <div className="text">Reports</div>
                          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                            {reportsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </>
                      )}
                    </a>

                    {!isCollapsed && (
                      <ul className="sub-menu" style={{ display: reportsOpen ? "block" : "none" }}>
                        {reportLinks.map((report, rIndex) => (
                          <li key={rIndex} className="sub-menu-item">
                            <Link
                              to={report.path}
                              onClick={closeSidebar}
                              className={isActive(report.path) ? "active-sub" : ""}
                            >
                              <div className="text">{report.name}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
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