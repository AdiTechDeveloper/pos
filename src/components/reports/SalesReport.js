import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";
import { RefreshCw, FileSpreadsheet, FileDown } from "lucide-react";
import DataTable from "react-data-table-component";


const getInvoiceCustomerName = (row) =>
  row.customer?.name ||
  row.customer_name ||
  row.customerName ||
  "Walk-in Customer";

const getInvoiceCustomerMobile = (row) =>
  row.customer?.mobile || row.customer_mobile || row.mobile || "-";

const formatPaymentMethod = (method) => {
  const value = String(method || "").trim();
  const normalized = value.toLowerCase().replace(/\s+/g, "");

  if (normalized.includes("cash") && normalized.includes("online")) {
    return "Split Payment";
  }

  return value || "-";
};

export default function SalesReport() { 
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const defaultFilters = {
    date_range: "this_month",
    date_from: "",
    date_to: "",
    bill_status: "all",
    branch_id: "",
  };

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
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
      const params = {
        date_range: filters.date_range,
        bill_status: filters.bill_status,
        branch_id: filters.branch_id || null,
      };

      if (filters.date_range === "custom") {
        params.date_from = filters.date_from;
        params.date_to = filters.date_to;
      }

      const res = await axios.get(`${BASE_URL}/api/reports/sales-report`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      setReport(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const getSummaryData = () => {
    if (!report) return {};

    if (
      report.payment_methods?.summary &&
      Object.keys(report.payment_methods.summary).length > 0
    ) {
      return report.payment_methods.summary;
    }

    const generatedSummary = {};

    (report.invoices?.rows || []).forEach((inv) => {
      const method = inv.payment_methods || "Unknown";
      if (!generatedSummary[method]) {
        generatedSummary[method] = {
          amount: 0,
          count: 0,
          bills: [],
        };
      }
      generatedSummary[method].amount += Number(
        inv.paid_amount || inv.total_amount || 0,
      );
      generatedSummary[method].count += 1;
      if (inv.bill_no) {
        generatedSummary[method].bills.push(inv.bill_no);
      }
    });

    if (Object.keys(generatedSummary).length === 0) {
      (report.payment_methods?.rows || []).forEach((pm) => {
        generatedSummary[pm.method] = {
          amount: Number(pm.total_collected || 0),
          count: 0,
          bills: [],
        };
      });
    }

    return generatedSummary;
  };

  const exportToExcel = () => {
    if (!report) return;

    let csvData = [];

    csvData.push(["--- PAYMENT METHOD BREAKDOWN ---"]);
    csvData.push(["Payment Method", "Total Collected", "Share %"]);

    (report.payment_methods?.rows || []).forEach((pm) => {
      csvData.push([pm.method, pm.total_collected, `${pm.share_pct}%`]);
    });

    csvData.push([
      "Grand Total Collected",
      report.payment_methods?.grand_total || 0,
      "100%",
    ]);
    csvData.push([]);
    csvData.push([`--- ${activeTab.toUpperCase()} DETAILED REPORT ---`]);

    let headers = [];
    let rows = [];

    if (activeTab === "invoices") {
      headers = [
        "Date",
        "Bill No",
        "Customer Name",
        "Mobile No",
        "Subtotal",
        "GST",
        "Total",
        "Paid",
        "Due",
        "Profit",
        "Status",
        "Payment Method",
      ];
      rows = (report.invoices?.rows || []).map((row) => [
        new Date(row.created_at).toLocaleDateString(),
        String(row.bill_no),
        getInvoiceCustomerName(row),
        getInvoiceCustomerMobile(row),
        row.subtotal,
        row.total_gst,
        row.total_amount,
        row.paid_amount,
        row.due_amount,
        row.total_profit,
        row.payment_status,
        formatPaymentMethod(row.payment_methods),
      ]);
    } else if (activeTab === "products") {
      headers = ["Product Name", "Qty Sold", "Net Revenue", "Profit"];
      rows = (report.products?.rows || []).map((p) => [
        p.product_name,
        p.qty_sold,
        p.net_revenue,
        p.total_profit,
      ]);
    } else if (activeTab === "payments") {
      headers = ["Method", "Total Collected", "Share %"];
      rows = (report.payment_methods?.rows || []).map((p) => [
        formatPaymentMethod(p.method),
        p.total_collected,
        `${p.share_pct}%`,
      ]);
    } else if (activeTab === "summary") {
      const summaryObj = getSummaryData();
      headers = [
        "Payment Mode",
        "Total Amount",
        "Bill Count",
        "Associated Bills",
      ];
      rows = Object.entries(summaryObj).map(([method, item]) => [
        formatPaymentMethod(method).toUpperCase(),
        Number(item?.amount ?? 0),
        Number(item?.count ?? 0),
        Array.isArray(item?.bills)
          ? item.bills.join(", ")
          : typeof item?.bills === "string"
            ? item.bills
            : "N/A",
      ]);
    } else if (activeTab === "overrides") {
      headers = [
        "Bill No",
        "Product Name",
        "Original Price",
        "Override Price",
        "Value Leakage",
      ];
      rows = (report.price_overrides?.rows || []).map((o) => [
        String(o.bill_no),
        o.product_name,
        o.original_price,
        o.override_price,
        o.value_leakage,
      ]);
    }

    csvData.push(headers);
    csvData = csvData.concat(rows);

    const worksheet = XLSX.utils.aoa_to_sheet(csvData);
    const billNoColumn = headers.indexOf("Bill No");

    if (billNoColumn !== -1) {
      const firstDataRow = csvData.length - rows.length;
      rows.forEach((_, rowIndex) => {
        const cellAddress = XLSX.utils.encode_cell({
          r: firstDataRow + rowIndex,
          c: billNoColumn,
        });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].t = "s";
          worksheet[cellAddress].v = String(rows[rowIndex][billNoColumn]);
        }
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, `Sales_Report_${activeTab}_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!report) return;

    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text(`Sales Report - ${activeTab.toUpperCase()}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);

    doc.setFontSize(12);
    doc.text("Payment Method Breakdown", 14, 28);

    const paymentHeaders = [["Method", "Total Collected (Rs.)", "Share (%)"]];
    const paymentRows = (report.payment_methods?.rows || []).map((p) => [
      formatPaymentMethod(p.method),
      `Rs. ${p.total_collected}`,
      `${p.share_pct}%`,
    ]);

    paymentRows.push([
      "Grand Total",
      `Rs. ${report.payment_methods?.grand_total || 0}`,
      "100%",
    ]);

    autoTable(doc, {
      head: paymentHeaders,
      body: paymentRows,
      startY: 32,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
      margin: { bottom: 10 },
    });

    const nextStartY = doc.lastAutoTable.finalY + 10;
    doc.text(`${activeTab.toUpperCase()} Details`, 14, nextStartY);

    let headers = [];
    let rows = [];

    if (activeTab === "invoices") {
      headers = [
        [
          "Date",
          "Bill No",
          "Customer Name",
          "Mobile No",
          "Subtotal",
          "GST",
          "Total",
          "Paid",
          "Due",
          "Profit",
          "Status",
          "Payment Method",
        ],
      ];
      rows = (report.invoices?.rows || []).map((row) => [
        new Date(row.created_at).toLocaleDateString(),
        String(row.bill_no),
        getInvoiceCustomerName(row),
        getInvoiceCustomerMobile(row),
        `Rs. ${row.subtotal}`,
        `Rs. ${row.total_gst}`,
        `Rs. ${row.total_amount}`,
        `Rs. ${row.paid_amount}`,
        `Rs. ${row.due_amount}`,
        `Rs. ${row.total_profit}`,
        row.payment_status,
        formatPaymentMethod(row.payment_methods),
      ]);
    } else if (activeTab === "products") {
      headers = [["Product Name", "Qty Sold", "Net Revenue", "Profit"]];
      rows = (report.products?.rows || []).map((p) => [
        p.product_name,
        p.qty_sold,
        `Rs. ${p.net_revenue}`,
        `Rs. ${p.total_profit}`,
      ]);
    } else if (activeTab === "payments") {
      headers = [["Method", "Total Collected", "Share %"]];
      rows = (report.payment_methods?.rows || []).map((p) => [
        formatPaymentMethod(p.method),
        `Rs. ${p.total_collected}`,
        `${p.share_pct}%`,
      ]);
    } else if (activeTab === "summary") {
      const summaryObj = getSummaryData();
      headers = [
        ["Payment Mode", "Total Amount", "Bill Count", "Associated Bills"],
      ];
      rows = Object.entries(summaryObj).map(([method, item]) => [
        formatPaymentMethod(method).toUpperCase(),
        `Rs. ${item?.amount ?? 0}`,
        `${item?.count ?? 0} bills`,
        Array.isArray(item?.bills)
          ? item.bills.join(", ")
          : typeof item?.bills === "string"
            ? item.bills
            : "N/A",
      ]);
    } else if (activeTab === "overrides") {
      headers = [
        [
          "Bill No",
          "Product Name",
          "Original Price",
          "Override Price",
          "Value Leakage",
        ],
      ];
      rows = (report.price_overrides?.rows || []).map((o) => [
        o.bill_no,
        o.product_name,
        `Rs. ${o.original_price}`,
        `Rs. ${o.override_price}`,
        `Rs. ${o.value_leakage}`,
      ]);
    }

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: nextStartY + 4,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      didParseCell: function (data) {
        if (
          activeTab === "invoices" &&
          data.section === "body" &&
          data.column.index === 8
        ) {
          const rawVal = String(data.cell.raw).replace("Rs. ", "").trim();
          if (parseFloat(rawVal) > 0) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    doc.save(`Sales_Report_${activeTab}_${Date.now()}.pdf`);
  };

  if (loading)
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
          <div className="text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-3xl font-semibold text-gray-900">
              Loading sales report...
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
  const summaryData = getSummaryData();

  return (
    <Layout>
      <div className="p-8 bg-white min-h-screen text-gray-900">
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
              Sales Report
              </h3>

            </div>
          </div>

        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mt-6 mb-6">
            <div className="flex justify-between items-end gap-4 w-full">

          <div className="grid grid-cols-1 lg:grid-cols-8 gap-6 mb-6">
            <div>
              <label className="text-2xl font-semibold text-gray-900">
                Date Range
              </label>
              <select
                className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
                value={filters.date_range}
                onChange={(e) =>
                  setFilters({ ...filters, date_range: e.target.value })
                }
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-2xl font-semibold text-gray-900">
                Bill Status
              </label>
              <select
                className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
                value={filters.bill_status}
                onChange={(e) =>
                  setFilters({ ...filters, bill_status: e.target.value })
                }
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
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
          
            <div className="flex flex-wrap gap-4">
              <button
                onClick={resetFilters}
                title={loading ? "Loading..." : "Refresh"}
                className="flex items-center justify-center bg-green-600 text-white h-[40px] w-[40px] rounded-xl shadow-md hover:bg-green-700 transition-colors shrink-0 mb-[2px]"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} size={21} />
              </button>
              <button
                onClick={exportToExcel}
                title="Export as CSV"
                className="flex items-center justify-center bg-green-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-green-700 shadow-md"
              >
                <FileSpreadsheet size={21} />
              </button>

              <button
                onClick={exportToPDF}
                title="Export as PDF"
                className="flex items-center justify-center bg-red-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-red-700 shadow-md"
              >
                <FileDown size={21} />
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-6 mt-6 mb-10">
          <Card
            title="Gross Sales"
            value={k.gross_sales}
            variant="bg-blue-50 text-blue-700 border-blue-200"                                      
          />
          <Card
            title="COGS"
            value={k.total_cogs}
            variant="bg-amber-50 text-amber-700 border-amber-200"
          />
          <Card
            title="Profit"
            value={k.total_profit}
            extra={`Margin ${k.profit_margin_pct}%`}
            variant="bg-emerald-50 text-emerald-700 border-emerald-200"
          />
          <Card
            title="Collected"
            value={k.total_collected}
            variant="bg-teal-50 text-teal-700 border-teal-200"
          />
          <Card
            title="Outstanding"
            value={k.total_due}
            variant="bg-rose-50 text-rose-700 border-rose-200"
          />
           <SmallCard label="CGST" value={k.tax_breakdown.cgst} />
          <SmallCard label="SGST" value={k.tax_breakdown.sgst} />
          <SmallCard label="IGST" value={k.tax_breakdown.igst} />
        </div>

      

        {/* TABS */}
             <div className="flex flex-wrap justify-center gap-3 mt-10 mb-6 border-b border-gray-200 text-center">
        {["invoices", "products", "payments", "summary", "overrides"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 rounded-t-2xl font-semibold text-2xl transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab === "summary" ? "SUMMARY" : tab.toUpperCase()}
            </button>
          ),
        )}
      </div>

        {/* TAB CONTENT */}
        {activeTab === "invoices" && <InvoiceTable data={report.invoices} />}
        {activeTab === "products" && <ProductTable data={report.products} />}
        {activeTab === "payments" && (
          <PaymentTable data={report.payment_methods} />
        )}
        {activeTab === "summary" && (
          <PaymentSummaryTable summary={summaryData} />
        )}
        {activeTab === "overrides" && (
          <OverrideTable data={report.price_overrides} />
        )}
      </div>
    </Layout>
  );
}

const Card = ({
  title,
  value,
  extra,
  variant = "from-sky-100 to-blue-200",
}) => (
  <div
    className={`bg-gradient-to-br ${variant} p-4 m- 6 rounded-3xl shadow-xl border border-gray-200 hover:-translate-y-1 transform transition-all duration-300`}
  >
    <p className="text-xl font-semibold text-gray-700 mb-3 text-center">{title}</p>
    <h2 className="text-2xl font-bold text-gray-900 text-center">₹{value}</h2>
    {extra && (
      <p className="text-2xl text-gray-700 font-medium mt-4 text-center">{extra}</p>
    )}
  </div>
);

const SmallCard = ({ label, value, color = "from-slate-50 to-slate-100" }) => (
  <div
    className={`bg-purple-50 text-purple-700 border-purple-200 px-6 py-4 rounded-3xl border border-gray-200 shadow-sm flex-1`}
  >
    <p className="text-xl text-purple-700 ">{label}</p>
    <p className="text-3xl font-bold mt-2 text-purple-700">₹{value}</p>
  </div>
);

const InvoiceTable = ({ data }) => {
  const columns = [
    {
      name: "Date",
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      name: "Bill No",
      selector: (row) => row.bill_no,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="text-base font-semibold text-gray-800">
          {row.bill_no}
        </span>
      ),
    },
    {
      name: "Customer Name",
      selector: (row) => getInvoiceCustomerName(row),
      sortable: true,
    },
    {
      name: "Mobile No",
      selector: (row) => getInvoiceCustomerMobile(row),
    },
    {
      name: "Subtotal",
      selector: (row) => row.subtotal,
      sortable: true,
      right: true,
      cell: (row) => <span>₹{row.subtotal}</span>,
    },
    {
      name: "GST",
      selector: (row) => row.total_gst,
      sortable: true,
      right: true,
      cell: (row) => <span>₹{row.total_gst}</span>,
    },
    {
      name: "Total",
      selector: (row) => row.total_amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-gray-900">
          ₹{row.total_amount}
        </span>
      ),
    },
    {
      name: "Paid",
      selector: (row) => row.paid_amount,
      sortable: true,
      right: true,
      cell: (row) => <span>₹{row.paid_amount}</span>,
    },
    {
      name: "Due",
      selector: (row) => row.due_amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span
          className={`font-semibold ${
            row.due_amount > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          ₹{row.due_amount}
        </span>
      ),
    },
    {
      name: "Profit",
      selector: (row) => row.total_profit,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-green-600">
          ₹{row.total_profit}
        </span>
      ),
    },
    {
      name: "Status",
      center: true,
      cell: (row) => <StatusBadge status={row.payment_status} />,
    },
    {
      name: "Payment Method",
      center: true,
      cell: (row) => formatPaymentMethod(row.payment_methods),
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={data.rows}
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
              fontSize: "15px",
              padding: "14px 16px",
            },
          },
        }}
      />

      {/* Totals strip - kept separate since DataTable has no <tfoot> */}
      <div className="grid grid-cols-8 gap-2 bg-gray-100 border-t-2 border-gray-200 px-4 py-4 font-bold text-gray-900 text-2xl">
        <div className="col-span-1">Total</div>
        <div className="text-right">
          ₹{(Number(data.totals.subtotal) || 0).toFixed(2)}
        </div>
        <div className="text-right">
          ₹{(Number(data.totals.total_gst) || 0).toFixed(2)}
        </div>
        <div className="text-right">
          ₹{(Number(data.totals.total_amount) || 0).toFixed(2)}
        </div>
        <div className="text-right">
          ₹{(Number(data.totals.paid_amount) || 0).toFixed(2)}
        </div>
        <div className="text-right">
          ₹{(Number(data.totals.due_amount) || 0).toFixed(2)}
        </div>
        <div className="text-right text-green-600">
          ₹{(Number(data.totals.total_profit) || 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
};



const ProductTable = ({ data }) => {
  const columns = [
    {
      name: "Name",
      selector: (row) => row.product_name,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <span className="font-semibold text-gray-800">
          {row.product_name}
        </span>
      ),
    },
    {
      name: "Qty",
      selector: (row) => row.qty_sold,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-gray-700">{row.qty_sold}</span>
      ),
    },
    {
      name: "Revenue",
      selector: (row) => row.net_revenue,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-gray-700">
          ₹{row.net_revenue}
        </span>
      ),
    },
    {
      name: "Profit",
      selector: (row) => row.total_profit,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-green-600">
          ₹{row.total_profit}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={data.rows}
        pagination
        highlightOnHover
        responsive
        customStyles={{
          headCells: {
            style: {
              fontWeight: 600,
              fontSize: "14px",
              color: "#374151",
              backgroundColor: "#e0f2fe",
            },
          },
          cells: {
            style: {
              fontSize: "14px",
              padding: "14px 16px",
            },
          },
        }}
      />
    </div>
  );
};

const PaymentTable = ({ data }) => (
  <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
    <div className="space-y-5">
      {(data?.rows || []).map((p, i) => (
        <div
          key={i}
          className="flex justify-between items-center border-b border-gray-200 pb-5 hover:bg-gray-50 px-4 py-4 rounded-2xl transition-colors"
        >
          <span className="font-semibold text-3xl text-gray-800">
            {formatPaymentMethod(p.method)}
          </span>
          <span className="text-3xl text-gray-700">
            <span className="font-bold text-yellow-600">
              ₹{p.total_collected}
            </span>
            <span className="text-gray-500 ml-4">({p.share_pct}%)</span>
          </span>
        </div>
      ))}
    </div>
    <div className="mt-7 pt-6 border-t-2 border-gray-300 font-bold text-3xl flex justify-between">
      <span className="text-gray-800">Total:</span>
      <span className="text-green-600">₹{data.grand_total}</span>
    </div>
  </div>
);

// SAFE PAYMENT SUMMARY TABLE COMPONENT


const PaymentSummaryTable = ({ summary }) => {
  const summaryEntries = Object.entries(summary || {});

  const rows = summaryEntries.map(([method, item]) => ({
    method,
    ...item,
  }));

  const totalAmount = Object.values(summary || {}).reduce(
    (sum, item) => sum + (Number(item?.amount) || 0),
    0,
  );
  const totalCount = Object.values(summary || {}).reduce(
    (sum, item) => sum + (Number(item?.count) || 0),
    0,
  );

  const columns = [
    {
      name: "Payment Method",
      selector: (row) => row.method,
      sortable: true,
      cell: (row) => (
        <span className="inline-block px-4 py-2 bg-blue-100 text-blue-900 rounded-xl font-bold text-lg">
          {formatPaymentMethod(row.method).toUpperCase()}
        </span>
      ),
    },
    {
      name: "Total Amount",
      selector: (row) => row.amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-bold text-green-600">
          ₹{Number(row.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Bill Count",
      selector: (row) => row.count,
      sortable: true,
      center: true,
      cell: (row) => (
        <span className="font-semibold text-gray-800">{row.count ?? 0}</span>
      ),
    },
    {
      name: "Associated Bills",
      grow: 2,
      cell: (row) => {
        const hasBills = Array.isArray(row.bills) && row.bills.length > 0;
        return hasBills ? (
          <div className="flex flex-wrap gap-2 py-2">
            {row.bills.map((billNo, idx) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 text-2xl font-mono font-semibold rounded-lg bg-gray-100 text-gray-700"
              >
                {billNo}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        );
      },
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={rows}
        highlightOnHover
        responsive
        noDataComponent={
          <p className="text-base text-gray-500 font-semibold py-8">
            No payment summary available.
          </p>
        }
        customStyles={{
          headCells: {
            style: {
              fontWeight: 600,
              fontSize: "14px",
              color: "#374151",
              backgroundColor: "#e0f2fe",
            },
          },
          cells: {
            style: {
              fontSize: "14px",
              padding: "14px 16px",
            },
          },
        }}
      />

      {summaryEntries.length > 0 && (
        <div className="grid grid-cols-4 gap-2 bg-gray-100 text-2xl border-t-2 border-gray-200 px-4 py-4 font-bold text-gray-900">
          <div>Total</div>
          <div className="text-right text-green-600">
            ₹{totalAmount.toFixed(2)}
          </div>
          <div className="text-center">{totalCount}</div>
          <div></div>
        </div>
      )}
    </div>
  );
};


const OverrideTable = ({ data }) => {
  const columns = [
    {
      name: "Bill No",
      selector: (row) => row.bill_no,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="font-semibold text-gray-800">{row.bill_no}</span>
      ),
    },
    {
      name: "Product",
      selector: (row) => row.product_name,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <span className="font-semibold text-gray-800">
          {row.product_name}
        </span>
      ),
    },
    {
      name: "Original",
      selector: (row) => row.original_price,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-gray-700">
          ₹{row.original_price}
        </span>
      ),
    },
    {
      name: "Override",
      selector: (row) => row.override_price,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-semibold text-gray-700">
          ₹{row.override_price}
        </span>
      ),
    },
    {
      name: "Leakage",
      selector: (row) => row.value_leakage,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-bold text-red-600">₹{row.value_leakage}</span>
      ),
    },
  ];

  return (
    <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
      <DataTable
        columns={columns}
        data={data.rows}
        pagination
        highlightOnHover
        responsive
        customStyles={{
          headCells: {
            style: {
              fontWeight: 600,
              fontSize: "14px",
              color: "#374151",
              backgroundColor: "#e0f2fe",
            },
          },
          cells: {
            style: {
              fontSize: "14px",
              padding: "14px 16px",
            },
          },
        }}
      />
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    paid: "bg-green-100 text-green-800 border border-green-300",
    partial: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    unpaid: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`px-6 py-4 rounded-full text-2xl font-semibold ${colors[status] || "bg-gray-200 text-gray-800 border border-gray-300"
        }`}
    >
      {status}
    </span>
  );
};
