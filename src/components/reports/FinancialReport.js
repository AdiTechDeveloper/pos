import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../layout";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppData } from "../../context/AppDataContext";
import { RotateCcw, FileSpreadsheet, FileDown } from "lucide-react";
import DataTable from "react-data-table-component";



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
  const csvFilename = `financial-report-${filters.date_range === "custom"
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
      `Date Range: ${filters.date_range === "custom"
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
      `financial-report-${filters.date_range === "custom"
        ? `${filters.date_from}_to_${filters.date_to}`
        : filters.date_range
      }.pdf`,
    );
  };

  return (
    <Layout>
      <div className="p-8 bg-white min-h-screen text-gray-900">
        {/* HEADER */}
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
                Financial Report
              </h3>

            </div>
          </div>

        </div>
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-xl text-gray-600 mt-6">
            Overview of sales, purchases, net profits, and outstanding
            collections.
          </p>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
            <div className="flex flex-wrap items-end gap-6">
              <div className="shrink-0">
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

              <div className="shrink-0">
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

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={resetFilters}
                title="Reset Filters"
                className="flex items-center justify-center bg-green-600 text-white w-[48px] h-[48px] rounded-xl shadow-md hover:bg-green-700 transition-all"
              >
                <RotateCcw size={20} />
              </button>

              <button
                type="button"
                onClick={exportPDF}
                title="Export as PDF"
                className="flex items-center justify-center bg-red-600 text-white w-[48px] h-[48px] rounded-xl hover:bg-red-700 transition-all"
              >
                <FileDown size={20} />
              </button>

              <button
                type="button"
                onClick={exportCSV}
                title="Export as CSV"
                className="flex items-center justify-center bg-green-600 text-white w-[48px] h-[48px] rounded-xl hover:bg-green-700 transition-all"
              >
                <FileSpreadsheet size={20} />
              </button>
            </div>
          </div>

          {filters.date_range === "custom" && (
            <div className="flex flex-wrap items-end gap-6 mb-6">
              <div className="shrink-0">
                <label className="text-xl font-semibold text-gray-900">
                  From
                </label>
                <input
                  type="date"
                  className="block mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={filters.date_from}
                  onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                  }
                />
              </div>
              <div className="shrink-0">
                <label className="text-2xl font-semibold text-gray-900">
                  To
                </label>
                <input
                  type="date"
                  className="block mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={filters.date_to}
                  onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* KPI CARDS CONTAINER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-6 mt-4 mb-10">
          <Card
            title="Total Sales"
            value={k.total_sales}
            variant="bg-blue-50 text-blue-700 border-blue-200"
          />
          <Card
            title="Total Purchase"
            value={k.total_purchase}
            variant="bg-amber-50 text-amber-700 border-amber-200"
          />
          <Card
            title="Net Profit"
            value={k.profit}
            variant={
             "bg-emerald-50 text-emerald-700 border-emerald-200"
            }
          />
          <Card
            title="Amount Received"
            value={k.received_amount}
            variant="bg-teal-50 text-teal-700 border-teal-200"
          />
          <Card
            title="Pending Amount"
            value={k.pending_amount}
            variant="bg-rose-50 text-rose-700 border-rose-200"
          />
          <SmallCard label="CGST Collected" value={gst.cgst} />
          <SmallCard label="SGST Collected" value={gst.sgst} />
          <SmallCard label="IGST Collected" value={gst.igst} />
        </div>

       

        {/* TABS CONTROLLER */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 border-b border-gray-200">
          {["products", "customer dues", "daily trend"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 rounded-t-2xl font-semibold text-2xl transition-all ${activeTab === tab
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
    className={`bg-gradient-to-br ${variant} p-8 rounded-3xl shadow-xl border border-gray-200 mt-8 text-center hover:-translate-y-1 transform transition-all duration-300`}
  >
    <p className="text-xl font-semibold text-gray-700 mb-3">{title}</p>
    <h2 className="text-2xl font-bold text-gray-900">
      ₹
      {(Number(value) || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}
    </h2>
  </div>
);

const SmallCard = ({ label, value , variant}) => (
  <div className={`bg-gradient-to-br ${variant} p-8 rounded-3xl shadow-xl border mt-8  border-gray-200 hover:-translate-y-1 transform transition-all duration-300`}>
    <p className="text-xl text-purple-600">{label}</p>
    <p className="text-2xl font-bold mt-2 text-purple-700">
      ₹{(Number(value) || 0).toFixed(2)}
    </p>
  </div>
);


const ProductTable = ({ data }) => {
  const columns = [
    {
      name: "Product Name",
      selector: (row) => row.name,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="text-2xl text-gray-800 font-semibold">
          {row.name}
        </span>
      ),
    },
    {
      name: "Qty Sold",
      selector: (row) => Number(row.total_qty),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-2xl font-semibold text-gray-700">
          {Number(row.total_qty).toFixed(0)}
        </span>
      ),
    },
    {
      name: "Total Sales Valuation",
      selector: (row) => Number(row.total_sales),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-2xl font-bold text-green-600">
          ₹{Number(row.total_sales).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        pagination
        highlightOnHover
        responsive
        customStyles={{
          headCells: {
            style: {
              fontWeight: 600,
              fontSize: "16px",
              color: "#374151",
              backgroundColor: "#e0f2fe",
            },
          },
          cells: {
            style: {
              fontSize: "16px",
              padding: "14px 16px",
            },
          },
        }}
      />
    </div>
  );
};




const DuesTable = ({ data }) => {
  const columns = [
    {
      name: "Customer Name",
      selector: (row) => row.name,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="text-2xl text-gray-800 font-semibold">
          {row.name}
        </span>
      ),
    },
    {
      name: "Total Outstanding Balance",
      selector: (row) => Number(row.total_due),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-2xl font-bold text-red-600">
          ₹{Number(row.total_due).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        pagination
        highlightOnHover
        responsive
        customStyles={{
          headCells: {
            style: {
              fontWeight: 600,
              fontSize: "16px",
              color: "#374151",
              backgroundColor: "#e0f2fe",
            },
          },
          cells: {
            style: {
              fontSize: "16px",
              padding: "14px 16px",
            },
          },
        }}
      />
    </div>
  );
};



const DailyTrendTable = ({ data }) => {
  const columns = [
    {
      name: "Date",
      selector: (row) => row.date,
      sortable: true,
      cell: (row) => (
        <span className="text-2xl font-semibold text-gray-700">
          {row.date}
        </span>
      ),
    },
    {
      name: "Sales Amount",
      selector: (row) => Number(row.sales),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-2xl font-semibold text-gray-900">
          ₹{Number(row.sales).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Received",
      selector: (row) => Number(row.received),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-2xl font-bold text-green-600">
          ₹{Number(row.received).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Due",
      selector: (row) => Number(row.due),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-2xl font-bold text-red-600">
          ₹{Number(row.due).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        pagination
        highlightOnHover
        responsive
        customStyles={{
          headCells: {
            style: {
              fontWeight: 600,
              fontSize: "20px",
              color: "#374151",
              backgroundColor: "#e0f2fe",
            },
          },
          cells: {
            style: {
              fontSize: "16px",
              padding: "14px 16px",
            },
          },
        }}
      />
    </div>
  );
};

