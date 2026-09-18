import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../layout";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppData } from "../../context/AppDataContext";

export default function SalesReport() {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const defaultFilters = {
    date_range: "this_month",
    date_from: "",
    date_to: "",
    branch_id: "",
  };

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState("products"); // Defaulting to products to showcase analytics
  const [filters, setFilters] = useState(defaultFilters);
  const appData = useAppData();
  const branches = appData?.branches || [];

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const fetchBranches = () => {
    appData?.loadBranches();
  };

  const fetchReport = async () => {
    const token = user_data?.token;
    try {
      if (report) {
        setFetching(true);
      } else {
        setLoading(true);
      }
      const params = {
        branch_id: filters.branch_id || null,
      };

      if (filters.date_range === "custom") {
        params.from_date = filters.date_from;
        params.to_date = filters.date_to;
      }

      const res = await axios.get(`${BASE_URL}/api/reports/financial-report`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      setReport(res.data.data || res.data);
      setLoading(false);
      setFetching(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);
  if (loading)
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
          <div className="text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-3xl font-semibold text-gray-900">
              Loading sales report...
            </p>
            <p className="mt-2 text-2xl text-gray-500">
              Please wait while we fetch your latest metrics.
            </p>
          </div>
        </div>
      </Layout>
    );

  if (!report)
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
          <p className="text-2xl font-semibold">No data available.</p>
        </div>
      </Layout>
    );

  const k = report.kpis;
  const gst = report.gst;
  const buildCsvData = () => {
    const rows = [];

    rows.push(["FINANCIAL REPORT"]);
    rows.push(["Total Sales", k.total_sales]);
    rows.push(["Total Purchase", k.total_purchase]);
    rows.push(["Net Profit", k.profit]);
    rows.push(["Amount Received", k.received_amount]);
    rows.push(["Pending Amount", k.pending_amount]);
    rows.push(["CGST", gst.cgst]);
    rows.push(["SGST", gst.sgst]);
    rows.push(["IGST", gst.igst]);
    rows.push([]);

    rows.push(["TOP PRODUCTS"]);
    rows.push(["Product Name", "Qty Sold", "Total Sales"]);
    (report.top_products || []).forEach((p) => {
      rows.push([p.name, p.total_qty, p.total_sales]);
    });
    rows.push([]);

    rows.push(["CUSTOMER DUES"]);
    rows.push(["Customer Name", "Total Due"]);
    (report.customer_dues || []).forEach((d) => {
      rows.push([d.name, d.total_due]);
    });
    rows.push([]);

    rows.push(["DAILY TREND"]);
    rows.push(["Date", "Sales", "Received", "Due"]);
    (report.charts?.daily_sales || []).forEach((row) => {
      rows.push([row.date, row.sales, row.received, row.due]);
    });

    return rows;
  };

  const csvData = buildCsvData();
  const csvFilename = `financial-report-${
    filters.date_range === "custom"
      ? `${filters.date_from}_to_${filters.date_to}`
      : filters.date_range
  }.csv`;

  const exportCSV = () => {
    const csvContent = csvData
      .map((row) =>
        row
          .map((cell) => {
            const value =
              cell === undefined || cell === null ? "" : String(cell);
            if (value.includes(",") || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", csvFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDF export
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Financial Report", 14, 18);

    doc.setFontSize(11);
    doc.text(
      `Date Range: ${
        filters.date_range === "custom"
          ? `${filters.date_from} to ${filters.date_to}`
          : "This Month"
      }`,
      14,
      26,
    );

    autoTable(doc, {
      startY: 32,
      head: [["Metric", "Value (Rs.)"]],
      body: [
        ["Total Sales", Number(k.total_sales).toFixed(2)],
        ["Total Purchase", Number(k.total_purchase).toFixed(2)],
        ["Net Profit", Number(k.profit).toFixed(2)],
        ["Amount Received", Number(k.received_amount).toFixed(2)],
        ["Pending Amount", Number(k.pending_amount).toFixed(2)],
        ["CGST", Number(gst.cgst).toFixed(2)],
        ["SGST", Number(gst.sgst).toFixed(2)],
        ["IGST", Number(gst.igst).toFixed(2)],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Product Name", "Qty Sold", "Total Sales (Rs.)"]],
      body: (report.top_products || []).map((p) => [
        p.name,
        Number(p.total_qty).toFixed(0),
        Number(p.total_sales).toFixed(2),
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Customer Name", "Total Due (Rs.)"]],
      body: (report.customer_dues || []).map((d) => [
        d.name,
        Number(d.total_due).toFixed(2),
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Date", "Sales (Rs.)", "Received (Rs.)", "Due (Rs.)"]],
      body: (report.charts?.daily_sales || []).map((row) => [
        row.date,
        Number(row.sales).toFixed(2),
        Number(row.received).toFixed(2),
        Number(row.due).toFixed(2),
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(
      `financial-report-${
        filters.date_range === "custom"
          ? `${filters.date_from}_to_${filters.date_to}`
          : filters.date_range
      }.pdf`,
    );
  };

  return (
    <Layout>
      <div className="p-8 bg-white min-h-screen text-gray-900">
        {/* HEADER */}
        <h1 className="text-5xl font-extrabold mb-3 text-gray-900">
          Financial Report
        </h1>
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-3xl text-gray-600 mt-6">
            Overview of sales, purchases, net profits, and outstanding
            collections.
          </p>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-2xl font-semibold text-gray-900">
                Date Preset
              </label>
              <select
                className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
                value={filters.date_range}
                onChange={(e) =>
                  setFilters({ ...filters, date_range: e.target.value })
                }
              >
                <option value="this_month">This Month (Default)</option>
                <option value="custom">Custom Date Range</option>
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
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                  value={filters.date_to}
                  onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
            <div className="text-gray-600 text-2xl">
              Filters update automatically when changed.
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-blue-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-blue-700 transition-all"
            >
              Reset Filters
            </button>
          </div>
          <button
            type="button"
            onClick={exportPDF}
            className="bg-red-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-red-700 transition-all"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="bg-green-600 px-8 py-4 ml-4 rounded-2xl text-white text-2xl font-semibold hover:bg-green-700 transition-all"
          >
            Export CSV
          </button>
        </div>

        {/* KPI CARDS CONTAINER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mt-4 mb-10">
          <Card
            title="Total Sales"
            value={k.total_sales}
            variant="from-sky-100 to-blue-200"
          />
          <Card
            title="Total Purchase"
            value={k.total_purchase}
            variant="from-violet-100 to-fuchsia-200"
          />
          <Card
            title="Net Profit"
            value={k.profit}
            variant={
              k.profit >= 0
                ? "from-emerald-100 to-lime-200"
                : "from-red-100 to-orange-200"
            }
          />
          <Card
            title="Amount Received"
            value={k.received_amount}
            variant="from-amber-100 to-orange-200"
          />
          <Card
            title="Pending Amount"
            value={k.pending_amount}
            variant="from-rose-100 to-pink-200"
          />
        </div>

        {/* GST BREAKDOWN */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <SmallCard label="CGST Collected" value={gst.cgst} />
          <SmallCard label="SGST Collected" value={gst.sgst} />
          <SmallCard label="IGST Collected" value={gst.igst} />
        </div>

        {/* TABS CONTROLLER */}
        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200">
          {["products", "customer dues", "daily trend"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 rounded-t-2xl font-semibold text-2xl transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* RENDER DYNAMIC DATA ARRAYS FROM BACKEND */}
        {activeTab === "products" && (
          <ProductTable data={report.top_products || []} />
        )}
        {activeTab === "customer dues" && (
          <DuesTable data={report.customer_dues || []} />
        )}
        {activeTab === "daily trend" && (
          <DailyTrendTable data={report.charts?.daily_sales || []} />
        )}
      </div>
    </Layout>
  );
}

const Card = ({ title, value, variant }) => (
  <div
    className={`bg-gradient-to-br ${variant} p-8 rounded-3xl shadow-xl border border-gray-200`}
  >
    <p className="text-2xl font-semibold text-gray-700 mb-3">{title}</p>
    <h2 className="text-4xl font-bold text-gray-900">
      ₹
      {(Number(value) || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}
    </h2>
  </div>
);

const SmallCard = ({ label, value }) => (
  <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 rounded-3xl border border-gray-200 text-gray-900 shadow-sm flex-1">
    <p className="text-xl text-gray-600">{label}</p>
    <p className="text-3xl font-bold mt-2">
      ₹{(Number(value) || 0).toFixed(2)}
    </p>
  </div>
);

const ProductTable = ({ data }) => (
  <div className="overflow-auto bg-white shadow-xl border border-gray-200">
    <table className="w-full text-lg">
      <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
        <tr>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Product Name
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Qty Sold
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Total Sales Valuation
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((p, i) => (
          <tr
            key={i}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td className="px-6 py-5 text-2xl text-gray-800 font-semibold">
              {p.name}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
              {Number(p.total_qty).toFixed(0)}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-bold text-green-600">
              ₹{Number(p.total_sales).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DuesTable = ({ data }) => (
  <div className="overflow-auto bg-white shadow-xl border border-gray-200">
    <table className="w-full text-lg">
      <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
        <tr>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Customer Name
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Total Outstanding Balance
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr
            key={i}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td className="px-6 py-5 text-2xl text-gray-800 font-semibold">
              {d.name}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-bold text-red-600">
              ₹{Number(d.total_due).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DailyTrendTable = ({ data }) => (
  <div className="overflow-auto bg-white shadow-xl border border-gray-200">
    <table className="w-full text-lg">
      <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
        <tr>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Date
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Sales Amount
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Received
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Due
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={i}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td className="px-6 py-5 text-2xl font-semibold text-gray-700">
              {row.date}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-semibold text-gray-900">
              ₹{Number(row.sales).toFixed(2)}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-bold text-green-600">
              ₹{Number(row.received).toFixed(2)}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-bold text-red-600">
              ₹{Number(row.due).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
