import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import * as XLSX from "xlsx";
import Layout from "../layout";
import { Link } from "react-router-dom";
import {
  XCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";
import { hasFeature } from "../../utils/hasFeature";
import { useAppData } from "../../context/AppDataContext";

const WINDOW_OPTIONS = [
  { value: "all", label: "All batches" },
  { value: "7", label: "Expired + next 7 days" },
  { value: "30", label: "Expired + next 30 days" },
  { value: "60", label: "Expired + next 60 days" },
  { value: "90", label: "Expired + next 90 days" },
];

const formatDate = (d) => (d ? d.split("-").reverse().join("-") : "-");

const StockExpiryReport = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const appData = useAppData();
  const branches = appData?.branches || [];

  // Pharmacy: 30 / 90 din, baaki stores: pehle jaisa 7 / 30 din
  const isPharmacy = hasFeature("pharmacy");
  const CRITICAL_DAYS = isPharmacy ? 30 : 7;
  const NEAR_DAYS = isPharmacy ? 90 : 30;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [windowDays, setWindowDays] = useState(isPharmacy ? "90" : "all");
  const [branchId, setBranchId] = useState("");

  const customStyles = {
    headCells: {
      style: {
        fontWeight: "bold",
        fontSize: "14px",
        whiteSpace: "normal",
      },
    },
    rows: {
      style: {
        fontSize: "15px",
        minHeight: "56px",
      },
    },
    cells: {
      style: {
        fontSize: "15px",
      },
    },
  };

  useEffect(() => {
    appData?.loadBranches();
    // eslint-disable-next-line
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = {};
      if (windowDays !== "all") params.days = windowDays;
      if (branchId) params.branch_id = branchId;

      const res = await axios.get(`${BASE_URL}/api/reports/expiry-details`, {
        headers: {
          Authorization: `Bearer ${user_data?.token}`,
        },
        params,
      });

      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [BASE_URL, user_data?.token, windowDays, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return data;

    return data.filter((item) =>
      `${item.product_name} ${item.batch_no} ${item.branch_name} ${item.expiry_date}`
        .toLowerCase()
        .includes(text),
    );
  }, [data, search]);

  // Status server ke days_left se (browser timezone par depend nahi)
  const getStatus = (daysLeft) => {
    if (daysLeft < 0)
      return {
        label: "Expired",
        class: "bg-danger",
        icon: <XCircle size={16} />,
      };
    if (daysLeft <= CRITICAL_DAYS)
      return {
        label: "Critical",
        class: "bg-warning",
        icon: <AlertTriangle size={16} />,
      };
    if (daysLeft <= NEAR_DAYS)
      return {
        label: "Near Expiry",
        class: "bg-info",
        icon: <Clock size={16} />,
      };

    return {
      label: "Safe",
      class: "bg-success",
      icon: <CheckCircle size={16} />,
    };
  };

  const daysText = (d) => {
    if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago`;
    if (d === 0) return "Today";
    return `${d} day${d === 1 ? "" : "s"}`;
  };

  const summary = useMemo(() => {
    const s = {
      expired: { count: 0, value: 0 },
      critical: { count: 0, value: 0 },
      near: { count: 0, value: 0 },
    };

    filteredData.forEach((r) => {
      const bucket =
        r.days_left < 0
          ? s.expired
          : r.days_left <= CRITICAL_DAYS
            ? s.critical
            : r.days_left <= NEAR_DAYS
              ? s.near
              : null;

      if (bucket) {
        bucket.count += 1;
        bucket.value += Number(r.stock_value || 0);
      }
    });

    return s;
  }, [filteredData, CRITICAL_DAYS, NEAR_DAYS]);

  const exportToExcel = () => {
    if (!filteredData.length) return;

    const rows = filteredData.map((r) => ({
      Branch: r.branch_name,
      Product: r.product_name,
      "Batch No": r.batch_no || "",
      "Expiry Date": formatDate(r.expiry_date),
      "Days Left": r.days_left,
      Qty: Number(r.remaining_qty),
      "Stock Value (Cost)": Number(r.stock_value),
      Status: getStatus(r.days_left).label,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expiry");
    XLSX.writeFile(wb, `Stock_Expiry_${Date.now()}.xlsx`);
  };

  const columns = [
    {
      name: "Product",
      selector: (row) => row.product_name,
      sortable: true,
      minWidth: "220px",
      wrap: true,
    },
    {
      name: "Batch No",
      sortable: true,
      selector: (row) => row.batch_no,
      minWidth: "150px",
    },
    {
      name: "Branch",
      sortable: true,
      selector: (row) => row.branch_name,
      minWidth: "140px",
      omit: branches.length <= 1,
    },
    {
      name: "Expiry Date",
      sortable: true,
      selector: (row) => row.expiry_date,
      cell: (row) => formatDate(row.expiry_date),
      width: "140px",
    },
    {
      name: "Days Left",
      sortable: true,
      selector: (row) => row.days_left,
      cell: (row) => daysText(row.days_left),
      width: "140px",
    },
    {
      name: "Qty",
      selector: (row) => row.remaining_qty,
      sortable: true,
      width: "90px",
      center: true,
    },
    {
      name: "Stock Value",
      selector: (row) => Number(row.stock_value),
      cell: (row) => `₹${Number(row.stock_value || 0).toFixed(2)}`,
      sortable: true,
      right: true,
      minWidth: "130px",
    },
    {
      name: "Status",
      sortable: true,
      selector: (row) => row.days_left,
      center: true,
      minWidth: "150px",
      cell: (row) => {
        const status = getStatus(row.days_left);
        return (
          <span className={`status-badge ${status.class}`} title={status.label}>
            {status.icon}
            <span style={{ marginLeft: 6 }}>{status.label}</span>
          </span>
        );
      },
    },
  ];

  const cards = [
    ["Expired", summary.expired, "bg-danger"],
    [`Critical (≤ ${CRITICAL_DAYS} days)`, summary.critical, "bg-warning"],
    [`Near Expiry (≤ ${NEAR_DAYS} days)`, summary.near, "bg-info"],
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Header */}
          <div className="flex items-center justify-between mb-27">
            <div className="flex items-center flex-wrap justify-between gap20 mb-27">
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "34px",
                    borderRadius: "999px",
                    background: "linear-gradient(180deg, #2f63f6, #1f49dd)",
                    display: "inline-block",
                  }}
                />
                <div>
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#111827",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Stock Expiry Report
                  </h3>
                </div>
              </div>
            </div>
            <ul className="breadcrumbs flex items-center gap10">
              <li>
                <Link to="/">Dashboard</Link>
              </li>
              <li>Reports</li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>Expiry</li>
            </ul>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {cards.map(([title, b, cls]) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <span className={`status-badge ${cls}`}>{title}</span>
                <div className="mt-3 text-2xl font-bold text-gray-900">
                  {b.count} batch{b.count === 1 ? "" : "es"}
                </div>
                <div className="text-lg text-gray-600">
                  Stock value: ₹{b.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Main Box */}
          <div className="wg-box">
            <div className="flex items-end gap-4 flex-wrap mb-4">
              <div>
                <label className="text-xl font-semibold text-gray-900 block">
                  Show
                </label>
                <select
                  className="block mt-2 rounded-xl border border-gray-300 px-3 py-2.5 text-xl"
                  value={windowDays}
                  onChange={(e) => setWindowDays(e.target.value)}
                >
                  {WINDOW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {branches.length > 1 && (
                <div>
                  <label className="text-xl font-semibold text-gray-900 block">
                    Branch
                  </label>
                  <select
                    className="block mt-2 rounded-xl border border-gray-300 px-3 py-2.5 text-xl"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={exportToExcel}
                title="Export as Excel"
                className="flex items-center justify-center bg-green-500 text-white w-[44px] h-[44px] rounded-xl hover:bg-green-700 shadow-md"
              >
                <FileSpreadsheet size={22} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center justify-between gap10 flex-wrap">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search product, batch, branch..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>

                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              columns={columns}
              data={filteredData}
              progressPending={loading}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={customStyles}
              noDataComponent={
                <p className="text-xl text-gray-500 font-semibold py-8">
                  No batches found for this selection.
                </p>
              }
            />

            <div className="divider"></div>
          </div>
        </div>

        <style>{`
        .status-badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          display: inline-flex;
          align-items: center;
        }

        .bg-danger { background: #ef4444; }
        .bg-warning { background: #f59e0b; }
        .bg-info { background: #3b82f6; }
        .bg-success { background: #10b981; }

        .rdt_TableCol_Sortable,
        .rdt_TableCol_Sortable > div,
        .rdt_TableCol > div {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          line-height: 1.2;
        }
      `}</style>
      </div>
    </Layout>
  );
};

export default StockExpiryReport;
