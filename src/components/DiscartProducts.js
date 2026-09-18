import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Layout from "./layout";
import { useAppData } from "../context/AppDataContext";

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
      date_to: filters.date_range === "custom" && !filters.date_to ? todayString() : filters.date_to,
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
      row.expiry_date ? new Date(row.expiry_date).toLocaleDateString("en-GB") : "—",
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
    doc.text(`Total Loss: ₹${Number(report?.total_loss || 0).toFixed(2)}`, 14, finalY);

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
        <h1 className="text-5xl font-extrabold mb-3 text-gray-900">
          Expired Stock
        </h1>
        <p className="text-3xl text-gray-600 mb-6">
          Track expired inventory, batch details, and product loss by branch.
        </p>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-2xl font-semibold text-gray-900">
                Date Range
              </label>
              <select
                className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
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
                className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
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
          </div>

          {filters.date_range === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-2xl font-semibold text-gray-900">
                  From
                </label>
                <input
                  type="date"
                  className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
                  value={filters.date_from}
                  onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-2xl font-semibold text-gray-900">
                  To
                </label>
                <input
                  type="date"
                  className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
                  value={filters.date_to || todayString()}
                  onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
            <div className="w-full lg:w-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, batch, branch..."
                className="w-full lg:w-96 rounded-2xl border border-gray-300 px-4 py-4 text-2xl outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={resetFilters}
                className="bg-blue-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-blue-700 transition-all"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="bg-emerald-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-emerald-700 transition-all"
              >
                Apply
              </button>
              <button
                onClick={exportToPDF}
                className="bg-red-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-red-700 transition-all"
              >
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="bg-emerald-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-emerald-700 transition-all"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-4 mb-10">
          <Card
            title="Total Loss"
            value={Number(report?.total_loss || 0)}
            variant="from-rose-100 to-pink-200"
          />
          <Card
            title="Expired Qty"
            value={totalExpiredQty}
            variant="from-amber-100 to-orange-200"
          />
          <Card
            title="Batch Count"
            value={filteredRows.length}
            variant="from-violet-100 to-fuchsia-200"
          />
          <Card
            title="Branch"
            value={appliedFilters.branch_id ? "Selected" : "All"}
            variant="from-sky-100 to-blue-200"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SmallCard
            label="From"
            value={report?.from_date ? new Date(report.from_date).toLocaleDateString("en-GB") : "—"}
            color="from-slate-50 to-slate-100"
          />
          <SmallCard
            label="To"
            value={report?.to_date ? new Date(report.to_date).toLocaleDateString("en-GB") : "—"}
            color="from-slate-50 to-slate-100"
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
          <div className="overflow-auto bg-white shadow-xl border border-gray-200">
            <table className="w-full text-lg">
              <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
                    Branch
                  </th>
                  <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
                    Product
                  </th>
                  <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
                    Batch No
                  </th>
                  <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
                    Barcode
                  </th>
                  <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
                    Expiry Date
                  </th>
                  <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
                    Expired Qty
                  </th>
                  <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
                    Cost Price
                  </th>
                  <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
                    Loss
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-5 text-2xl text-gray-800 font-medium">
                      {row.branch_name || "—"}
                    </td>
                    <td className="px-6 py-5 text-2xl text-gray-800 font-semibold">
                      {row.product_name || "—"}
                    </td>
                    <td className="px-6 py-5 text-2xl text-gray-700">
                      {row.batch_no || "—"}
                    </td>
                    <td className="px-6 py-5 text-2xl text-gray-700">
                      {row.batch_barcode || "—"}
                    </td>
                    <td className="px-6 py-5 text-right text-2xl text-gray-700">
                      {row.expiry_date
                        ? new Date(row.expiry_date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-6 py-5 text-right text-2xl font-semibold text-gray-900">
                      {row.expired_qty || 0}
                    </td>
                    <td className="px-6 py-5 text-right text-2xl text-gray-700">
                      ₹{Number(row.cost_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-5 text-right text-2xl font-bold text-red-600">
                      ₹{Number(row.loss_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 font-semibold text-gray-900">
                {branchTotals.map(({ branch, total }) => (
                  <tr key={branch} className="bg-amber-50/60">
                    <td colSpan="7" className="px-6 py-4 text-xl font-bold text-gray-800">
                      {branch} Total
                    </td>
                    <td className="px-6 py-4 text-right text-xl font-bold text-red-600">
                      ₹{Number(total).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="7" className="px-6 py-5 text-3xl font-bold">
                    Grand Total Loss
                  </td>
                  <td className="px-6 py-5 text-right text-3xl font-bold text-red-600">
                    ₹{Number(report?.total_loss || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

const Card = ({ title, value, variant = "from-sky-100 to-blue-200" }) => (
  <div
    className={`bg-gradient-to-br ${variant} p-8 rounded-3xl shadow-xl border border-gray-200 hover:-translate-y-1 transform transition-all duration-300`}
  >
    <p className="text-2xl font-semibold text-gray-700 mb-3">{title}</p>
    <h2 className="text-4xl font-bold text-gray-900">
      {typeof value === "number" ? `₹${value.toFixed(2)}` : value}
    </h2>
  </div>
);

const SmallCard = ({ label, value, color = "from-slate-50 to-slate-100" }) => (
  <div
    className={`bg-gradient-to-r ${color} px-6 py-4 rounded-3xl border border-gray-200 text-gray-900 shadow-sm flex-1`}
  >
    <p className="text-xl text-gray-600">{label}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

export default DiscardProducts;
