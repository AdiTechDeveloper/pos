import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import Layout from "../layout";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";
import { Check ,  RotateCcw, FileSpreadsheet, FileDown } from "lucide-react";


const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ShiftHistory = () => {
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const today = new Date().toISOString().split("T")[0];

  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [summary, setSummary] = useState({
    totalShifts: 0,
    totalCashCollected: 0,
    totalDiscrepancy: 0,
    totalOpening: 0,
    totalExpenses: 0,
    totalExpected: 0,
    totalActual: 0,
  });

  // Total Sales (fetched from Sales Report for the selected date range)
  const [totalSales, setTotalSales] = useState(0);
  const [salesLoading, setSalesLoading] = useState(false);

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
    cashier_id: "",
  });

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      : "—";

  const num = (v) => parseFloat(v || 0).toFixed(2);

  // Fetch shift report
  const fetchReport = useCallback(
    async (overrideFilters) => {
      setLoading(true);
      const f = overrideFilters || filters;
      try {
        const params = {};
        if (f.from_date) params.from_date = f.from_date;
        if (f.to_date) params.to_date = f.to_date;
        if (f.cashier_id) params.cashier_id = f.cashier_id;

        const response = await axios.get(
          `${BASE_URL}/api/staff/shift-history`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${user_data?.token}`,
            },
            params,
          },
        );

        const data = response.data.data || [];
        setRecords(data);
        setFilteredRecords(data);
      } catch (error) {
        console.error("Error fetching shift history:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters, user_data?.token],
  );

  // Fetch total sales for the same date range from Sales Report API
  const fetchTotalSales = useCallback(
    async (overrideFilters) => {
      const f = overrideFilters || filters;
      setSalesLoading(true);
      try {
        const params = {
          date_range: "custom",
          date_from: f.from_date,
          date_to: f.to_date,
          bill_status: "all",
          branch_id: null,
        };

        const res = await axios.get(`${BASE_URL}/api/reports/sales-report`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data?.token}`,
          },
          params,
        });

        const grossSales = res.data?.kpis?.gross_sales ?? 0;
        setTotalSales(parseFloat(grossSales) || 0);
      } catch (error) {
        console.error("Error fetching total sales:", error);
        setTotalSales(0);
      } finally {
        setSalesLoading(false);
      }
    },
    [user_data?.token],
  );

  useEffect(() => {
    fetchReport();
    fetchTotalSales();
  }, [filters]);

  // Client-side search
  useEffect(() => {
    const text = search.toLowerCase();
    setFilteredRecords(
      records.filter(
        (r) =>
          (r.user?.name?.toLowerCase() || "").includes(text) ||
          (r.user?.username?.toLowerCase() || "").includes(text) ||
          (r.opened_at || "").includes(text),
      ),
    );
  }, [search, records]);

  // Recompute summary totals whenever filtered records change
  useEffect(() => {
    const newSummary = {
      totalShifts: filteredRecords.length,
      totalCashCollected: filteredRecords.reduce(
        (s, r) => s + parseFloat(r.cash_collected || 0),
        0,
      ),
      totalDiscrepancy: filteredRecords.reduce(
        (s, r) => s + parseFloat(r.discrepancy || 0),
        0,
      ),
      totalOpening: filteredRecords.reduce(
        (s, r) => s + parseFloat(r.opening_balance || 0),
        0,
      ),
      totalExpenses: filteredRecords.reduce(
        (s, r) => s + parseFloat(r.other_expenses || 0),
        0,
      ),
      totalExpected: filteredRecords.reduce(
        (s, r) => s + parseFloat(r.expected_closing_balance || 0),
        0,
      ),
      totalActual: filteredRecords.reduce(
        (s, r) => s + parseFloat(r.closing_balance || 0),
        0,
      ),
    };
    setSummary(newSummary);
  }, [filteredRecords]);

  // Staff list (cashiers only — managers excluded from this filter)
  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/staff`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token}`,
        },
      })
      .then((res) => {
        const all = res.data.data || [];
        setStaffList(all.filter((s) => s.role === "cashier"));
      })
      .catch(console.error);
  }, []);

  const handleFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleClearFilters = () => {
    const cleared = { from_date: today, to_date: today, cashier_id: "" };
    setFilters(cleared);
    fetchReport(cleared);
    fetchTotalSales(cleared);
  };

  // Discrepancy badge
  const discrepancyBadge = (val) => {
    const d = parseFloat(val || 0);
    if (Math.abs(d) <= 0.01)
      return <span style={chip("#dcfce7", "#15803d")}>✓ Balanced</span>;
    if (d < 0)
      return (
        <span style={chip("#fef2f2", "#dc2626")}>
          ⚠ Short ₹{Math.abs(d).toFixed(2)}
        </span>
      );
    return (
      <span style={chip("#fff7ed", "#c2410c")}>↑ Excess ₹{d.toFixed(2)}</span>
    );
  };

  // Columns
  const columns = [
    {
      name: "#",
      cell: (row, index) => (currentPage - 1) * perPage + index + 1,
      width: "55px",
    },
    {
      name: "Cashier",
      selector: (row) => row.user?.name,
      sortable: true,
      width: "150px",
      cell: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "13px" }}>
            {row.user?.name || "—"}
          </div>
          <div style={{ color: "#9ca3af", fontSize: "11px" }}>
            {row.user?.username || ""}
          </div>
        </div>
      ),
    },
    {
      name: "Opened At",
      selector: (row) => row.created_at,
      sortable: true,
      width: "160px",
      cell: (row) => (
        <span style={{ fontSize: "12px" }}>{fmt(row.created_at)}</span>
      ),
    },
    {
      name: "Closed At",
      selector: (row) => row.closed_at,
      sortable: true,
      width: "160px",
      cell: (row) => (
        <span style={{ fontSize: "12px" }}>{fmt(row.updated_at)}</span>
      ),
    },
    {
      name: "Opening (₹)",
      selector: (row) => row.opening_balance,
      sortable: true,
      width: "120px",
      cell: (row) => <span>₹{num(row.opening_balance)}</span>,
    },
    {
      name: "Cash In (₹)",
      selector: (row) => row.cash_collected,
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span style={{ color: "#16a34a", fontWeight: 600 }}>
          +₹{num(row.cash_collected)}
        </span>
      ),
    },
    {
      name: "Expenses (₹)",
      selector: (row) => row.other_expenses,
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span style={{ color: "#dc2626" }}>
          {parseFloat(row.other_expenses || 0) > 0
            ? `-₹${num(row.other_expenses)}`
            : "—"}
        </span>
      ),
    },
    {
      name: "Expected (₹)",
      selector: (row) => row.expected_closing_balance,
      sortable: true,
      width: "125px",
      cell: (row) => <span>₹{num(row.expected_closing_balance)}</span>,
    },
    {
      name: "Actual (₹)",
      selector: (row) => row.closing_balance,
      sortable: true,
      width: "115px",
      cell: (row) => (
        <span style={{ fontWeight: 700 }}>₹{num(row.closing_balance)}</span>
      ),
    },
    {
      name: "Status",
      selector: (row) => row.discrepancy,
      sortable: true,
      width: "160px",
      cell: (row) => discrepancyBadge(row.discrepancy),
    },
    {
      name: "Expense Note",
      selector: (row) => row.expense_description,
      width: "160px",
      cell: (row) => (
        <span style={{ fontSize: "12px", color: "#6b7280" }}>
          {row.expense_description || "—"}
        </span>
      ),
    },
  ];

  // Export
  const getExportData = () =>
    filteredRecords.map((r) => ({
      Cashier: r.user?.name || "—",
      Username: r.user?.username || "—",
      "Opened At": fmt(r.opened_at),
      "Closed At": fmt(r.closed_at),
      "Opening (₹)": num(r.opening_balance),
      "Cash In (₹)": num(r.cash_collected),
      "Expenses (₹)": num(r.other_expenses),
      "Expected (₹)": num(r.expected_closing_balance),
      "Actual (₹)": num(r.closing_balance),
      "Discrepancy (₹)": num(r.discrepancy),
      "Expense Note": r.expense_description || "—",
    }));

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Shift History Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${filters.from_date} to ${filters.to_date}`, 14, 22);

    // Use "Rs." in the PDF only — UI/CSV keep the ₹ symbol.
    const rs = (v) => `Rs. ${num(v)}`;

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Cashier",
          "Opened At",
          "Closed At",
          "Opening",
          "Cash In",
          "Expenses",
          "Expected",
          "Actual",
          "Discrepancy",
        ],
      ],
      body: filteredRecords.map((r) => [
        r.user?.name || "—",
        fmt(r.opened_at),
        fmt(r.closed_at),
        rs(r.opening_balance),
        rs(r.cash_collected),
        rs(r.other_expenses),
        rs(r.expected_closing_balance),
        rs(r.closing_balance),
        rs(r.discrepancy),
      ]),
      foot: [
        [
          "TOTAL",
          "",
          "",
          `Rs. ${summary.totalOpening.toFixed(2)}`,
          `Rs. ${summary.totalCashCollected.toFixed(2)}`,
          `Rs. ${summary.totalExpenses.toFixed(2)}`,
          `Rs. ${summary.totalExpected.toFixed(2)}`,
          `Rs. ${summary.totalActual.toFixed(2)}`,
          `Rs. ${summary.totalDiscrepancy.toFixed(2)}`,
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
      },
    });

    doc.save(`shift-history-${filters.from_date}.pdf`);
  };

  const exportData = getExportData();

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Title */}
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
              <div className="flex items-center flex-wrap justify-between gap20 mb-27">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                Shift History Report
              </h3>

            </div>
          </div>

        </div>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right" />
              </li>
              <li>
                <div className="text-tiny">Shift History Report</div>
              </li>
            </ul>
          </div>

          {/* Summary Cards */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Total Shifts",
                value: summary.totalShifts,
                bg: "#eff6ff",
                border: "#bfdbfe",
                color: "#1d4ed8",
              },
              {
                label: "Total Sales (Day)",
                value: salesLoading ? "…" : `₹${totalSales.toFixed(2)}`,
                bg: "#ecfeff",
                border: "#a5f3fc",
                color: "#0e7490",
              },
              {
                label: "Total Cash Collected",
                value: `₹${summary.totalCashCollected.toFixed(2)}`,
                bg: "#f0fdf4",
                border: "#bbf7d0",
                color: "#15803d",
              },
              {
                label: "Total Expenses",
                value: `₹${summary.totalExpenses.toFixed(2)}`,
                bg: "#fff1f2",
                border: "#fecdd3",
                color: "#be123c",
              },
              {
                label: "Net Discrepancy",
                value: `₹${summary.totalDiscrepancy.toFixed(2)}`,
                bg: summary.totalDiscrepancy < 0 ? "#fef2f2" : "#fff7ed",
                border: summary.totalDiscrepancy < 0 ? "#fecaca" : "#fed7aa",
                color: summary.totalDiscrepancy < 0 ? "#dc2626" : "#c2410c",
              },
            ].map(({ label, value, bg, border, color }) => (
              <div
                key={label}
                className="wg-box"
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: "8px",
                  padding: "12px 10px",
                  flex: "1 1 200px",
                  maxWidth: "220px",
                  alignItems:"center"
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color,
                    margin: "0 0 5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {label}
                </p>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 800,
                    color,
                    margin: 0,
                  }}
                >
                  {value}
                </h3>
              </div>
            ))}
          </div>

          {/* Filters */}
              <div className="wg-box mb-20" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "12px",
            alignItems: "flex-end",
            flexWrap: "nowrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "120px" }}>
            <label
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#64748b",
                display: "block",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              START DATE
            </label>
            <input
              type="date"
              name="from_date"
              className="form-control"
              style={{
                height: "40px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                padding: "0 10px",
                width: "100%",
              }}
              value={filters.from_date}
              onChange={handleFilterChange}
            />
          </div>

          <div style={{ flex: 1, minWidth: "120px" }}>
            <label
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#64748b",
                display: "block",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              END DATE
            </label>
            <input
              type="date"
              name="to_date"
              className="form-control"
              style={{
                height: "40px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                padding: "0 10px",
                width: "100%",
              }}
              value={filters.to_date}
              onChange={handleFilterChange}
            />
          </div>

          <div style={{ flex: 1, minWidth: "130px" }}>
            <label
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#64748b",
                display: "block",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              CASHIER
            </label>
            <select
              name="cashier_id"
              className="form-control"
              value={filters.cashier_id}
              onChange={handleFilterChange}
              style={{
                height: "40px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                width: "100%",
              }}
            >
              <option value="">All Cashiers</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                fetchReport();
                fetchTotalSales();
              }}
              title="Apply Filters"
              className="flex items-center justify-center bg-green-600 text-white w-[40px] h-[40px] rounded-xl shadow-md hover:bg-green-700 transition-all"
            >
              <Check size={20} />
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              title="Clear Filters"
              className="flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-300 w-[40px] h-[40px] rounded-xl hover:bg-slate-200 transition-all"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <CSVLink
              data={exportData}
              filename={`shift-history-${filters.from_date}.csv`}
              title="Export as CSV"
              className="flex items-center justify-center bg-green-600 text-white w-[40px] h-[40px] rounded-xl hover:bg-green-700 transition-all"
            >
              <FileSpreadsheet size={20} />
            </CSVLink>

            <button
              type="button"
              onClick={exportToPDF}
              title="Export as PDF"
              className="flex items-center justify-center bg-red-600 text-white w-[40px] h-[40px] rounded-xl hover:bg-red-700 transition-all"
            >
              <FileDown size={20} />
            </button>
          </div>
        </div>
      </div>

          {/* Table */}
          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search by cashier name or username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>
                </form>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredRecords}
              pagination
              paginationPerPage={perPage}
              onChangePage={(page) => setCurrentPage(page)}
              highlightOnHover
              pointerOnHover
              responsive
              progressPending={loading}
              noDataComponent={
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 500 }}>
                    No shift records found
                  </p>
                </div>
              }
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "12px",
                    background: "#f9fafb",
                  },
                },
                rows: { style: { fontSize: "13px" } },
              }}
            />

            {filteredRecords.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#f9fafb",
                  borderTop: "2px solid #e5e7eb",
                  padding: "12px 16px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    flex: "0 0 55px",
                    fontWeight: 800,
                    fontSize: "13px",
                  }}
                >
                  Σ
                </div>
                <div
                  style={{
                    flex: "0 0 150px",
                    fontWeight: 800,
                    fontSize: "13px",
                  }}
                >
                  TOTAL
                </div>
                <div style={{ flex: "0 0 160px" }} />
                <div style={{ flex: "0 0 160px" }} />
                <div
                  style={{
                    flex: "0 0 120px",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  ₹{summary.totalOpening.toFixed(2)}
                </div>
                <div
                  style={{
                    flex: "0 0 120px",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#16a34a",
                  }}
                >
                  +₹{summary.totalCashCollected.toFixed(2)}
                </div>
                <div
                  style={{
                    flex: "0 0 120px",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#dc2626",
                  }}
                >
                  -₹{summary.totalExpenses.toFixed(2)}
                </div>
                <div
                  style={{
                    flex: "0 0 125px",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  ₹{summary.totalExpected.toFixed(2)}
                </div>
                <div
                  style={{
                    flex: "0 0 115px",
                    fontWeight: 800,
                    fontSize: "13px",
                  }}
                >
                  ₹{summary.totalActual.toFixed(2)}
                </div>
                <div
                  style={{
                    flex: "0 0 160px",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: summary.totalDiscrepancy < 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  ₹{summary.totalDiscrepancy.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ShiftHistory;

const chip = (bg, color) => ({
  background: bg,
  color,
  borderRadius: "20px",
  padding: "2px 10px",
  fontSize: "12px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  display: "inline-block",
});
