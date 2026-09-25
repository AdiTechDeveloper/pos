import React, { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";
import { Check, RefreshCw, FileSpreadsheet, FileDown } from "lucide-react";
import DataTable from "react-data-table-component";


export default function PurchaseReport() {
  const appData = useAppData();
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const defaultFilters = {
    date_range: "this_month",
    date_from: "",
    date_to: "",
    branch_id: "",
    supplier_id: "",
    isLost: 0,
  };

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("bills");
  const [filters, setFilters] = useState(defaultFilters);
  const branches = appData?.branches || [];
  const [suppliers, setSuppliers] = useState([]);

  const getCsvData = () => {
    if (!report) return [];
    const data =
      activeTab === "bills"
        ? report.bills.rows
        : activeTab === "products"
          ? report.products.rows
          : report.supplier_breakdown.rows;
    return data;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Purchase Report - ${activeTab.toUpperCase()}`, 14, 15);

    const tableData =
      activeTab === "bills"
        ? report.bills.rows.map((b) => [
          b.bill_date,
          b.bill_no,
          b.supplier_name,
          b.taxable_value,
          b.total_amount,
        ])
        : activeTab === "products"
          ? report.products.rows.map((p) => [
            p.product_name,
            p.total_qty,
            p.taxable_value,
            p.avg_purchase_rate,
          ])
          : report.supplier_breakdown.rows.map((s) => [
            s.supplier_name,
            s.bill_count,
            s.total_amount,
            s.share_pct,
          ]);

    const headers =
      activeTab === "bills"
        ? [["Date", "Bill No", "Supplier", "Taxable", "Total"]]
        : activeTab === "products"
          ? [["Name", "Qty", "Taxable", "Avg Rate"]]
          : [["Supplier", "Bills", "Amount", "Share %"]];

    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 25,
    });
    doc.save(`purchase_report_${activeTab}.pdf`);
  };

  const fetchBranches = () => {
    appData?.loadBranches();
  };

  const fetchSuppliers = async () => {
    const token = user_data?.token;
    try {
      const response = await axios.get(`${BASE_URL}/api/suppliers`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setSuppliers(response.data.suppliers || response.data.data || []);
    } catch (err) {
      console.error("Supplier fetch error:", err);
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const fetchReport = async (overrideFilters = null) => {
    const currentFilters = overrideFilters || filters;

    if (
      currentFilters.date_range === "custom" &&
      (!currentFilters.date_from || !currentFilters.date_to)
    ) {
      return;
    }

    try {
      setError(null);
      if (!report) {
        setLoading(true);
      }
      const token = user_data?.token;
      const params = {
        date_range: currentFilters.date_range,
        branch_id: currentFilters.branch_id || null,
        supplier_id: currentFilters.supplier_id || null,
        isLost: currentFilters.isLost ? 1 : 0,
      };

      if (currentFilters.date_range === "custom") {
        params.date_from = currentFilters.date_from;
        params.date_to = currentFilters.date_to;
      }

      if (user_data?.user?.store_id) {
        params.store_id = user_data.user.store_id;
      }

      const res = await axios.get(`${BASE_URL}/api/reports/purchase-report`, {
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
      setError(
        err.response?.data?.message || "Unable to load purchase report.",
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchSuppliers();
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
              Loading purchase report...
            </p>
            <p className="mt-2 text-base text-gray-500">
              Fetching the latest purchase metrics. Please wait.
            </p>
          </div>
        </div>
      </Layout>
    );

  if (error || !report)
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
          <div className="text-center">
            <p className="text-3xl font-semibold text-gray-900">
              {error || "No data available."}
            </p>
          </div>
        </div>
      </Layout>
    );

  const k = report.kpis;

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
                Purchase Report
              </h3>

            </div>
          </div>

        </div>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-6">
              <div className="shrink-0">
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

              <div className="shrink-0">
                <label className="text-2xl font-semibold text-gray-900">
                  Supplier
                </label>
                <select
                  className="block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl"
                  value={filters.supplier_id}
                  onChange={(e) =>
                    setFilters({ ...filters, supplier_id: e.target.value })
                  }
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 shrink-0">
              <button
                onClick={resetFilters}
                title={loading ? "Loading..." : "Refresh"}
                className="flex items-center justify-center bg-green-600 text-white h-[40px] w-[40px] rounded-xl shadow-md hover:bg-green-700 transition-colors shrink-0"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} size={21} />
              </button>
              {/* CSVLink acts as a clickable element itself */}
              <button
                onClick={getCsvData}
                title="Export as CSV"
                className="flex items-center justify-center bg-green-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-green-700 shadow-md"
              >
                <FileSpreadsheet size={21} />
              </button>

              <button
                onClick={exportPDF}
                title="Export as PDF"
                className="flex items-center justify-center bg-red-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-red-700 shadow-md"
              >
                <FileDown size={21} />
              </button>
            </div>
          </div>

          {filters.date_range === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-6 mb-10">
          <Card
            title="Total Purchase"
            value={k.total_purchase_value}
            variant="bg-blue-50 text-blue-700 border-blue-200"
          />
          <Card
            title="Taxable Value"
            value={k.total_taxable_value}
            variant="bg-amber-50 text-amber-700 border-amber-200"
          />
          <Card
            title="Total Tax"
            value={k.total_tax}
            variant="bg-emerald-50 text-emerald-700 border-emerald-200"
          />
          <Card
            title="Total Qty"
            value={k.total_qty}
            variant="bg-teal-50 text-teal-700 border-teal-200"
          />
          <Card
            title="Free Qty"
            value={k.total_free_qty}
            variant="bg-rose-50 text-rose-700 border-rose-200"
          />
          <SmallCard
            label="CGST"
            value={k.tax_breakdown.cgst}
            color="from-slate-50 to-slate-100"
          />
          <SmallCard
            label="SGST"
            value={k.tax_breakdown.sgst}
            color="from-slate-50 to-slate-100"
          />
          <SmallCard
            label="IGST"
            value={k.tax_breakdown.igst}
            color="from-slate-50 to-slate-100"
          />
        </div>



        <div className="flex flex-wrap justify-center gap-3 mt-10 mb-6 border-b border-gray-200 text-center">
          {[
            { key: "bills", label: "Bills" },
            { key: "products", label: "Products" },
            { key: "suppliers", label: "Suppliers" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 rounded-t-2xl font-semibold text-2xl transition-all ${activeTab === tab.key
                ? "bg-blue-600 text-white border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "bills" && (
          <Section title="Purchase Bills">
            <BillsTable data={report.bills} />
          </Section>
        )}

        {activeTab === "products" && (
          <Section title="Products">
            <ProductsTable data={report.products} />
          </Section>
        )}

        {activeTab === "suppliers" && (
          <Section title="Supplier Breakdown">
            <SupplierTable data={report.supplier_breakdown} />
          </Section>
        )}
      </div>
    </Layout>
  );
}

const Card = ({ title, value, variant = "from-sky-100 to-blue-200" }) => (
  <div
    className={`bg-gradient-to-br ${variant} p-8 rounded-3xl shadow-xl border border-gray-200 hover:-translate-y-1 transform transition-all duration-300`}
  >
    <p className="text-xl font-semibold text-gray-700 mb-3">{title}</p>
    <h2 className="text-2xl font-bold text-gray-900">₹{value}</h2>
  </div>
);

const SmallCard = ({ label, value, color = "from-slate-50 to-slate-100" }) => (
  <div
    className={`bg-purple-50 text-purple-700 border-purple-200 px-6 py-4 rounded-3xl border border-gray-200 shadow-sm flex-1`}
  >
    <p className="text-xl text-purple-600">{label}</p>
    <p className="text-3xl font-bold mt-2 text-purple-700">₹{value}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-3xl font-semibold text-gray-900 mb-4">{title}</h2>
    <div className="rounded-3xl bg-white shadow-xl border border-gray-200 p-6">
      {children}
    </div>
  </div>
);

const BillsTable = ({ data }) => {
  const columns = [
    {
      name: "Date",
      selector: (row) => row.bill_date,
      sortable: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {row.bill_date}
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
      name: "Supplier",
      selector: (row) => row.supplier_name,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {row.supplier_name}
        </span>
      ),
    },
    {
      name: "Taxable",
      selector: (row) => row.taxable_value,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          ₹{row.taxable_value}
        </span>
      ),
    },
    {
      name: "Tax",
      selector: (row) => row.total_tax,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          ₹{row.total_tax}
        </span>
      ),
    },
    {
      name: "Total",
      selector: (row) => row.total_amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base font-semibold text-gray-900">
          ₹{row.total_amount}
        </span>
      ),
    },
    {
      name: "Status",
      center: true,
      cell: (row) => (
        <StatusBadge
          status={row.received ? "Received" : "Pending"}
          received={row.received}
        />
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

      {/* Totals */}
      <div className="grid grid-cols-7 gap-2 bg-gray-100 border-t-2 border-gray-200 px-4 py-4 font-bold text-gray-900 text-2xl">
        <div>Total</div>

        <div></div>

        <div></div>

        <div className="text-right">
          ₹{(Number(data.totals.taxable_value) || 0).toFixed(2)}
        </div>

        <div className="text-right">
          ₹{(Number(data.totals.total_tax) || 0).toFixed(2)}
        </div>

        <div className="text-right">
          ₹{(Number(data.totals.total_amount) || 0).toFixed(2)}
        </div>

        <div></div>
      </div>
    </div>
  );
};


const ProductsTable = ({ data }) => {
  const columns = [
    {
      name: "Name",
      selector: (row) => row.product_name,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="text-base text-gray-800 font-semibold">
          {row.product_name}
        </span>
      ),
    },
    {
      name: "Qty",
      selector: (row) => row.total_qty,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {row.total_qty}
        </span>
      ),
    },
    {
      name: "Free",
      selector: (row) => row.total_free_qty,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {row.total_free_qty}
        </span>
      ),
    },
    {
      name: "Taxable",
      selector: (row) => row.taxable_value,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          ₹{row.taxable_value}
        </span>
      ),
    },
    {
      name: "Avg Rate",
      selector: (row) => row.avg_purchase_rate,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          ₹{parseFloat(row.avg_purchase_rate || 0).toFixed(2)}
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
    </div>
  );
};



const SupplierTable = ({ data }) => {
  const columns = [
    {
      name: "Supplier",
      selector: (row) => row.supplier_name,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span className="text-base text-gray-800 font-semibold">
          {row.supplier_name}
        </span>
      ),
    },
    {
      name: "Bills",
      selector: (row) => row.bill_count,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {row.bill_count}
        </span>
      ),
    },
    {
      name: "Amount",
      selector: (row) => row.total_amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          ₹{row.total_amount}
        </span>
      ),
    },
    {
      name: "Tax",
      selector: (row) => row.total_tax,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          ₹{row.total_tax}
        </span>
      ),
    },
    {
      name: "Share %",
      selector: (row) => row.share_pct,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-base text-gray-700">
          {row.share_pct}%
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

      {/* Total */}
      <div className="grid grid-cols-5 gap-2 bg-gray-100 border-t-2 border-gray-200 px-4 py-4 font-bold text-gray-900 text-2xl">
        <div className="col-span-2">
          Total
        </div>

        <div className="text-right">
          ₹{(Number(data.grand_total) || 0).toFixed(2)}
        </div>

        <div></div>

        <div></div>
      </div>
    </div>
  );
};



const StatusBadge = ({ status, received }) => {
  const colors = received
    ? "bg-green-100 text-green-800 border border-green-300"
    : "bg-red-100 text-red-800 border border-red-300";

  return (
    <span className={`px-4 py-2 rounded-full text-xl font-semibold ${colors}`}>
      {status}
    </span>
  );
};
