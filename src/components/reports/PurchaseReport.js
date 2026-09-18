import React, { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";

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
        <h1 className="text-5xl font-extrabold mb-3 text-gray-900">
          Purchase Report
        </h1>
        <p className="text-3xl text-gray-600 mb-8">
          Comprehensive purchase analytics with spend, tax, and supplier
          breakdowns.
        </p>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
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

            <div>
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

          <div className="flex flex-col lg:flex-row items-center gap-6 justify-between">
            <div className="text-gray-600 text-2xl">
              Filters update automatically when changed.
            </div>
            {/* <div className="flex items-center gap-4">
              <input
                id="isLost"
                type="checkbox"
                checked={filters.isLost}
                onChange={(e) =>
                  setFilters({ ...filters, isLost: e.target.checked })
                }
                className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="isLost"
                className="text-2xl font-semibold text-gray-900"
              >
                Show Lost Purchases
              </label>
            </div> */}

            <div className="flex flex-wrap gap-4">
              <button
                onClick={resetFilters}
                className="bg-blue-600 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-blue-700 transition-all"
              >
                Reset
              </button>
              {/* CSVLink acts as a clickable element itself */}
              <CSVLink
                data={getCsvData()}
                filename={`purchase_report_${activeTab}.csv`}
                style={{ color: "white" }}
                className="bg-green-500 px-8 py-4 rounded-2xl text-2xl font-semibold hover:bg-green-700 transition-all text-center"
              >
                Export CSV
              </CSVLink>
              <button
                onClick={exportPDF}
                className="bg-red-500 px-8 py-4 rounded-2xl text-white text-2xl font-semibold hover:bg-red-700 transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-10">
          <Card
            title="Total Purchase"
            value={k.total_purchase_value}
            variant="from-sky-100 to-blue-200"
          />
          <Card
            title="Taxable Value"
            value={k.total_taxable_value}
            variant="from-indigo-100 to-violet-200"
          />
          <Card
            title="Total Tax"
            value={k.total_tax}
            variant="from-emerald-100 to-lime-200"
          />
          <Card
            title="Total Qty"
            value={k.total_qty}
            variant="from-amber-100 to-orange-200"
          />
          <Card
            title="Free Qty"
            value={k.total_free_qty}
            variant="from-rose-100 to-pink-200"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-10">
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

        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200">
          {[
            { key: "bills", label: "Bills" },
            { key: "products", label: "Products" },
            { key: "suppliers", label: "Suppliers" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 rounded-t-2xl font-semibold text-2xl transition-all ${
                activeTab === tab.key
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
    <p className="text-2xl font-semibold text-gray-700 mb-3">{title}</p>
    <h2 className="text-5xl font-bold text-gray-900">₹{value}</h2>
  </div>
);

const SmallCard = ({ label, value, color = "from-slate-50 to-slate-100" }) => (
  <div
    className={`bg-gradient-to-r ${color} px-6 py-4 rounded-3xl border border-gray-200 text-gray-900 shadow-sm flex-1`}
  >
    <p className="text-xl text-gray-600">{label}</p>
    <p className="text-3xl font-bold mt-2">₹{value}</p>
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

const BillsTable = ({ data }) => (
  <div className="overflow-auto">
    <table className="w-full text-lg">
      <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
        <tr>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Date
          </th>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Bill No
          </th>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Supplier
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Taxable
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Tax
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Total
          </th>
          <th className="px-6 py-5 text-center text-2xl font-semibold text-gray-700">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((b) => (
          <tr
            key={b.id}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td className="px-6 py-5 text-2xl text-gray-700">{b.bill_date}</td>
            <td className="px-6 py-5 text-2xl font-semibold text-gray-800">
              {b.bill_no}
            </td>
            <td className="px-6 py-5 text-2xl text-gray-700">
              {b.supplier_name}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              ₹{b.taxable_value}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              ₹{b.total_tax}
            </td>
            <td className="px-6 py-5 text-right text-2xl font-semibold text-gray-900">
              ₹{b.total_amount}
            </td>
            <td className="px-6 py-5 text-center">
              <StatusBadge
                status={b.received ? "Received" : "Pending"}
                received={b.received}
              />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 font-semibold text-gray-900">
        <tr>
          <td colSpan="3" className="px-6 py-5 text-2xl font-bold">
            Total
          </td>
          <td className="px-6 py-5 text-right text-2xl font-bold">
            ₹{(Number(data.totals.taxable_value) || 0).toFixed(2)}
          </td>
          <td className="px-6 py-5 text-right text-2xl font-bold">
            ₹{(Number(data.totals.total_tax) || 0).toFixed(2)}
          </td>
          <td className="px-6 py-5 text-right text-2xl font-bold">
            ₹{(Number(data.totals.total_amount) || 0).toFixed(2)}
          </td>
          <td className="px-6 py-5"></td>
        </tr>
      </tfoot>
    </table>
  </div>
);

const ProductsTable = ({ data }) => (
  <div className="overflow-auto">
    <table className="w-full text-lg">
      <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
        <tr>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Name
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Qty
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Free
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Taxable
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Avg Rate
          </th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((p) => (
          <tr
            key={p.product_id}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td className="px-6 py-5 text-2xl text-gray-800 font-semibold">
              {p.product_name}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              {p.total_qty}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              {p.total_free_qty}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              ₹{p.taxable_value}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              ₹{parseFloat(p.avg_purchase_rate).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SupplierTable = ({ data }) => (
  <div className="overflow-auto">
    <table className="w-full text-lg">
      <thead className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b border-gray-200">
        <tr>
          <th className="px-6 py-5 text-left text-2xl font-semibold text-gray-700">
            Supplier
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Bills
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Amount
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Tax
          </th>
          <th className="px-6 py-5 text-right text-2xl font-semibold text-gray-700">
            Share %
          </th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((s) => (
          <tr
            key={s.supplier_id}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td className="px-6 py-5 text-2xl text-gray-800 font-semibold">
              {s.supplier_name}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              {s.bill_count}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              ₹{s.total_amount}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              ₹{s.total_tax}
            </td>
            <td className="px-6 py-5 text-right text-2xl text-gray-700">
              {s.share_pct}%
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 font-semibold text-gray-900">
        <tr>
          <td colSpan="2" className="px-6 py-5 text-2xl font-bold">
            Total
          </td>
          <td className="px-6 py-5 text-right text-2xl font-bold">
            ₹{(Number(data.grand_total) || 0).toFixed(2)}
          </td>
          <td className="px-6 py-5"></td>
          <td className="px-6 py-5"></td>
        </tr>
      </tfoot>
    </table>
  </div>
);

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
