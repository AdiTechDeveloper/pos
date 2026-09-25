import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Layout from "./layout";
import { useAppData } from "../context/AppDataContext";
import { Check, RefreshCw, FileSpreadsheet, FileDown } from "lucide-react";
import DataTable from "react-data-table-component";

const todayString = () => new Date().toISOString().split("T")[0];

const buildDefaultFilters = () => ({
  date_range: "this_month",
  date_from: "",
  date_to: todayString(),
  branch_id: "",
});

const DiscardProducts = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail")) || {};
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const appData = useAppData();
  const branches = appData?.branches || [];
  const [filters, setFilters] = useState(buildDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState(buildDefaultFilters());
  const [search, setSearch] = useState("");

  const resetFilters = () => {
    const nextFilters = buildDefaultFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const fetchBranches = useCallback(() => {
    appData?.loadBranches();
  }, [appData]);

  const fetchDiscardItems = useCallback(
    async (currentFilters = appliedFilters) => {
      const token = user_data?.token;

      try {
        setLoading(true);

        const params = {
          date_range: currentFilters.date_range,
          branch_id: currentFilters.branch_id || null,
        };

        if (currentFilters.date_range === "custom") {
          params.date_from = currentFilters.date_from;
          params.date_to = currentFilters.date_to || todayString();
        }

        const response = await axios.get(`${BASE_URL}/api/expired-products`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          params,
        });

        setReport(response.data);
      } catch (error) {
        console.error("Error fetching discard items:", error.response || error);
        setReport({
          status: false,
          data: [],
          total_loss: 0,
          branch_id: currentFilters.branch_id || "all",
          from_date: currentFilters.date_from || null,
          to_date: currentFilters.date_to || null,
        });
      } finally {
        setLoading(false);
      }
    },
    [BASE_URL, appliedFilters, user_data?.token]
  );

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchDiscardItems(appliedFilters);
  }, [appliedFilters, fetchDiscardItems]);

  const rows = useMemo(() => report?.data || [], [report]);

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return rows;

    return rows.filter((item) => {
      const haystack = [
        item.product_name,
        item.branch_name,
        item.batch_no,
        item.batch_barcode,
        item.expiry_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [rows, search]);

  const branchTotals = useMemo(() => {
    const map = {};

    filteredRows.forEach((item) => {
      const branchName = item.branch_name || "Unknown";
      map[branchName] = (map[branchName] || 0) + Number(item.loss_amount || 0);
    });

    return Object.entries(map).map(([branch, total]) => ({
      branch,
      total,
    }));
  }, [filteredRows]);

  const totalExpiredQty = rows.reduce(
    (sum, item) => sum + Number(item.expired_qty || 0),
    0
  );

  const handleDateRangeChange = (value) => {
    const nextFilters = {
      ...filters,
      date_range: value,
    };

    if (value !== "custom") {
      nextFilters.date_from = "";
      nextFilters.date_to = "";
    } else if (!nextFilters.date_to) {
      nextFilters.date_to = todayString();
    }

    setFilters(nextFilters);
  };

  const applyFilters = () => {
    const nextFilters = {
      ...filters,
      date_to:
        filters.date_range === "custom" && !filters.date_to
          ? todayString()
          : filters.date_to,
    };

    setAppliedFilters(nextFilters);
  };

  const exportToExcel = () => {
    if (!filteredRows.length) return;

    const exportRows = filteredRows.map((row) => ({
      Branch: row.branch_name || "—",
      Product: row.product_name || "—",
      "Batch No": row.batch_no || "—",
      Barcode: row.batch_barcode || "—",
      "Expiry Date": row.expiry_date
        ? new Date(row.expiry_date).toLocaleDateString("en-GB")
        : "—",
      "Expired Qty": Number(row.expired_qty || 0),
      "Cost Price": Number(row.cost_price || 0),
      Loss: Number(row.loss_amount || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expired Stock");
    XLSX.writeFile(workbook, `Expired_Stock_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredRows.length) return;

    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("Expired Stock Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);

    const headers = [
      [
        "Branch",
        "Product",
        "Batch No",
        "Barcode",
        "Expiry Date",
        "Expired Qty",
        "Cost Price",
        "Loss",
      ],
    ];

    const body = filteredRows.map((row) => [
      row.branch_name || "—",
      row.product_name || "—",
      row.batch_no || "—",
      row.batch_barcode || "—",
      row.expiry_date
        ? new Date(row.expiry_date).toLocaleDateString("en-GB")
        : "—",
      Number(row.expired_qty || 0),
      `₹${Number(row.cost_price || 0).toFixed(2)}`,
      `₹${Number(row.loss_amount || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: headers,
      body,
      startY: 28,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(
      `Total Loss: ₹${Number(report?.total_loss || 0).toFixed(2)}`,
      14,
      finalY
    );

    doc.save(`Expired_Stock_${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
          <div className="text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-3xl font-semibold text-gray-900">
              Loading expired stock...
            </p>
            <p className="mt-2 text-2xl text-gray-500">
              Please wait while we calculate your inventory loss.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 bg-white min-h-screen text-gray-900">
        <div className="flex items-center flex-wrap justify-between gap-5 mb-7">
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
                Expired Products
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: "2px 0 0 0",
                }}
              >
                Track products that have expired or are nearing expiry
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-[1fr_auto] items-end gap-4">
            <div
              className="grid items-end gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(0, max-content))",
              }}
            >
              <div>
                <label className="text-2xl font-semibold text-gray-900">
                  Date Range
                </label>
                <select
                  className="block mt-2 rounded-xl border border-gray-300 px-3 py-2.5 text-xl"
                  value={filters.date_range}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-2xl font-semibold text-gray-900">
                  Branch
                </label>
                <select
                  className="block mt-2 rounded-xl border border-gray-300 px-3 py-2.5 text-xl"
                  value={filters.branch_id}
                  onChange={(e) =>
                    setFilters({ ...filters, branch_id: e.target.value })
                  }
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {filters.date_range === "custom" && (
                <>
                  <div>
                    <label className="text-xl font-semibold text-gray-900">
                      From
                    </label>
                    <input
                      type="date"
                      className="block mt-2 rounded-xl border border-gray-300 px-3 py-2.5 text-xl"
                      value={filters.date_from}
                      onChange={(e) =>
                        setFilters({ ...filters, date_from: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xl font-semibold text-gray-900">
                      To
                    </label>
                    <input
                      type="date"
                      className="block mt-2 rounded-xl border border-gray-300 px-3 py-2.5 text-base"
                      value={filters.date_to || todayString()}
                      onChange={(e) =>
                        setFilters({ ...filters, date_to: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product, batch, branch..."
                  className="rounded-xl border border-gray-300 px-3 py-2.5 text-xl outline-none focus:border-blue-500 w-64"
                />
              </div>
            </div>

            <div className="grid grid-flow-col gap-3">
              <button
                onClick={resetFilters}
                title={loading ? "Loading..." : "Refresh"}
                className="flex items-center justify-center bg-green-600 text-white h-[44px] w-[44px] rounded-xl shadow-md hover:bg-green-700 transition-colors"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} size={22} />
              </button>
              <button
                type="button"
                onClick={applyFilters}
                title="Apply Filters"
                className="flex items-center justify-center bg-green-600 text-white w-[44px] h-[44px] rounded-xl shadow-md hover:bg-green-700 transition-all"
              >
                <Check size={22} />
              </button>
              <button
                onClick={exportToExcel}
                title="Export as Excel"
                className="flex items-center justify-center bg-green-500 text-white w-[44px] h-[44px] rounded-xl hover:bg-green-700 shadow-md"
              >
                <FileSpreadsheet size={22} />
              </button>
              <button
                onClick={exportToPDF}
                title="Export as PDF"
                className="flex items-center justify-center bg-red-500 text-white w-[44px] h-[44px] rounded-xl hover:bg-red-700 shadow-md"
              >
                <FileDown size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-6 mt-6 mb-10">
          <Card
            title="Total Loss"
            value={Number(report?.total_loss || 0)}
            isCurrency={true}
            variant="bg-blue-50 text-blue-700 border-blue-200 text-center"
          />
          <Card
            title="Expired Qty"
            value={totalExpiredQty}
            isCurrency={false}
            variant="bg-amber-50 text-amber-700 border-amber-200 text-center"
          />
          <Card
            title="Batch Count"
            value={filteredRows.length}
            isCurrency={false}
            variant="bg-emerald-50 text-emerald-700 border-emerald-200 text-center"
          />
          <Card
            title="Branch"
            value={appliedFilters.branch_id ? "Selected" : "All"}
            isCurrency={false}
            variant="bg-teal-50 text-teal-700 border-teal-200 text-center"
          />
          <SmallCard
            label="From"
            value={
              report?.from_date
                ? new Date(report.from_date).toLocaleDateString("en-GB")
                : "—"
            }
            color="bg-purple-50 text-purple-700 border-purple-200"
          />
          <SmallCard
            label="To"
            value={
              report?.to_date
                ? new Date(report.to_date).toLocaleDateString("en-GB")
                : "—"
            }
            color="bg-purple-50 text-purple-700 border-purple-200"
          />
        </div>

        {filteredRows.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-bold text-red-600">
              !
            </div>
            <h3 className="text-4xl font-bold text-gray-900 mb-3">
              No expired stock found
            </h3>
            <p className="text-2xl text-gray-500">
              Try changing the date range or branch filter to view records.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow-xl border border-gray-200 rounded-2xl overflow-hidden">
            <ExpiryReportTable
              filteredRows={filteredRows}
              branchTotals={branchTotals}
              report={report}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

const ExpiryReportTable = ({ filteredRows, branchTotals, report }) => {
  const columns = [
    {
      name: "Branch",
      selector: (row) => row.branch_name || "",
      sortable: true,
      cell: (row) => (
        <span className="text-xl text-gray-800 font-medium">
          {row.branch_name || "—"}
        </span>
      ),
      minWidth: "160px",
    },
    {
      name: "Product",
      selector: (row) => row.product_name || "",
      sortable: true,
      cell: (row) => (
        <span className="text-xl text-gray-800 font-semibold">
          {row.product_name || "—"}
        </span>
      ),
      minWidth: "200px",
    },
    {
      name: "Batch No",
      selector: (row) => row.batch_no || "",
      sortable: true,
      cell: (row) => (
        <span className="text-xl text-gray-700">{row.batch_no || "—"}</span>
      ),
      minWidth: "150px",
    },
    {
      name: "Barcode",
      selector: (row) => row.batch_barcode || "",
      sortable: true,
      cell: (row) => (
        <span className="text-xl text-gray-700">{row.batch_barcode || "—"}</span>
      ),
      minWidth: "170px",
    },
    {
      name: "Expiry Date",
      selector: (row) =>
        row.expiry_date ? new Date(row.expiry_date).getTime() : 0,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl text-gray-700">
          {row.expiry_date
            ? new Date(row.expiry_date).toLocaleDateString("en-GB")
            : "—"}
        </span>
      ),
      minWidth: "160px",
    },
    {
      name: "Expired Qty",
      selector: (row) => Number(row.expired_qty || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl font-semibold text-gray-900">
          {row.expired_qty || 0}
        </span>
      ),
      minWidth: "150px",
    },
    {
      name: "Cost Price",
      selector: (row) => Number(row.cost_price || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl text-gray-700">
          ₹{Number(row.cost_price || 0).toFixed(2)}
        </span>
      ),
      minWidth: "150px",
    },
    {
      name: "Loss",
      selector: (row) => Number(row.loss_amount || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl font-bold text-red-600">
          ₹{Number(row.loss_amount || 0).toFixed(2)}
        </span>
      ),
      minWidth: "150px",
    },
  ];

  const customStyles = {
    table: {
      style: {
        backgroundColor: "white",
      },
    },
    headRow: {
      style: {
        background:
          "linear-gradient(to right, rgb(219, 234, 254), rgb(207, 250, 254))",
        minHeight: "70px",
        borderBottom: "1px solid rgb(229, 231, 235)",
      },
    },
    headCells: {
      style: {
        fontSize: "18px",
        fontWeight: "600",
        color: "rgb(55, 65, 81)",
        paddingLeft: "24px",
        paddingRight: "24px",
      },
    },
    rows: {
      style: {
        minHeight: "70px",
        borderBottom: "1px solid rgb(243, 244, 246)",
      },
      highlightOnHoverStyle: {
        backgroundColor: "rgb(249, 250, 251)",
        cursor: "pointer",
      },
    },
    cells: {
      style: {
        paddingLeft: "24px",
        paddingRight: "24px",
      },
    },
    pagination: {
      style: {
        fontSize: "18px",
        minHeight: "65px",
      },
      pageButtonsStyle: {
        borderRadius: "6px",
        height: "40px",
        width: "40px",
        padding: "8px",
        margin: "2px",
        cursor: "pointer",
      },
    },
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredRows || []}
        customStyles={customStyles}
        pagination
        paginationPerPage={10}
        paginationRowsPerPageOptions={[5, 10, 20, 50]}
        highlightOnHover
        responsive
        persistTableHead
        noDataComponent={
          <div className="py-10 text-xl font-semibold text-gray-500">
            No expired products found
          </div>
        }
      />

      {/* Branch Totals */}
      {branchTotals?.length > 0 && (
        <div className="border-t-2 border-gray-200">
          {branchTotals.map(({ branch, total }) => (
            <div
              key={branch}
              className="flex items-center justify-between bg-amber-50/60 border-b border-gray-200 px-6 py-4"
            >
              <span className="text-xl font-bold text-gray-800">
                {branch} Total
              </span>
              <span className="text-xl font-bold text-red-600">
                ₹{Number(total).toFixed(2)}
              </span>
            </div>
          ))}

          {/* Grand Total */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5">
            <span className="text-xl font-bold text-gray-900">
              Grand Total Loss
            </span>
            <span className="text-3xl font-bold text-red-600">
              ₹{Number(report?.total_loss || 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

const Card = ({
  title,
  value,
  isCurrency = false,
  variant = "from-sky-100 to-blue-200",
}) => (
  <div
    className={`bg-gradient-to-br ${variant} p-8 rounded-3xl shadow-xl border border-gray-200 hover:-translate-y-1 transform transition-all duration-300`}
  >
    <p className="text-2xl font-semibold text-gray-700 mb-3">{title}</p>
    <h2 className="text-4xl font-bold text-gray-900">
      {isCurrency && typeof value === "number"
        ? `₹${value.toFixed(2)}`
        : value}
    </h2>
  </div>
);

const SmallCard = ({ label, value, color = "from-slate-50 to-slate-100" }) => (
  <div
    className={`bg-gradient-to-r ${color} px-6 py-4 rounded-3xl border border-gray-200 shadow-sm flex-1`}
  >
    <p className="text-xl">{label}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

export default DiscardProducts;