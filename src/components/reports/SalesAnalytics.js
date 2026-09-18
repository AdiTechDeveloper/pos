import React, { useEffect, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import Layout from "../layout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Link } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const SalesAnalytics = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const appData = useAppData();

  const [filters, setFilters] = useState({
    start_date: (() => {
      const d = new Date();
      d.setDate(1);
      return d.toLocaleDateString("en-CA");
    })(),
    end_date: new Date().toLocaleDateString("en-CA"),
    branch_id: "",
  });

  const [summary, setSummary] = useState([]);
  const [hourly, setHourly] = useState({});
  const [topProducts, setTopProducts] = useState([]);
  const [slowProducts, setSlowProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [highestSale, setHighestSale] = useState(null);
  const [lowestSale, setLowestSale] = useState(null);
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [brandSales, setBrandSales] = useState([]);
  const [branch, setbranch] = useState([]);
  const [loading, setLoading] = useState(false);

  const exportPDF = () => {
    if (!summary.length) {
      alert("No data available to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("Sales Analytics Report", 14, 15);
    const tableRows = summary.map((row) => [
      row.date,
      row.bills,
      row.total_taxable,
      row.total_gst,
      row.total_amount,
      row.total_profit,
    ]);

    autoTable(doc, {
      head: [["Date", "Bills", "Taxable", "GST", "Net Sales", "Profit"]],
      body: tableRows,
      startY: 25,
    });

    doc.save("sales-analytics.pdf");
  };

  const exportCSV = () => {
    if (!summary.length) {
      alert("No data available to export");
      return;
    }

    const headers = ["Date", "Bills", "Taxable", "GST", "Net Sales", "Profit"];
    const rows = summary.map((row) => [
      row.date,
      row.bills,
      row.total_taxable,
      row.total_gst,
      row.total_amount,
      row.total_profit,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-analytics.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchBrach = () => {
    appData?.loadBranches();
  };

  useEffect(() => {
    setbranch(appData?.branches || []);
  }, [appData?.branches]);

  const fetchReport = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/reports/sales-analytics`,
        filters,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      const data = response.data;

      setSummary(data.summary || []);
      setHourly(data.hourly_heatmap || {});
      setTopProducts(data.top_products || []);
      setSlowProducts(data.slow_products || []);
      setPaymentMethods(data.payment_methods || {});
      setHighestSale(data.sales_extremes?.highest_day || null);
      setLowestSale(data.sales_extremes?.lowest_day || null);
      setBranchPerformance(data.branch_performance || []);
      setBrandSales(data.brand_sales || []);
    } catch (error) {
      console.log("Sales Analytics Error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
    fetchBrach();
  }, [fetchReport]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const summaryColumns = [
    {
      name: "Date",
      selector: (row) => row.date,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="text-2xl font-extrabold text-slate-800">{row.date}</div>
      ),
    },
    {
      name: "Bills",
      selector: (row) => row.bills,
      center: true,
      cell: (row) => (
        <span className="text-2xl font-black text-slate-800">{row.bills}</span>
      ),
    },
    {
      name: "Taxable",
      cell: (row) => (
        <span className="text-3xl font-bold text-green-600">
          ₹{parseFloat(row.total_taxable).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "GST",
      cell: (row) => (
        <span className="text-3xl font-bold text-yellow-600">
          ₹{parseFloat(row.total_gst).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "Net",
      cell: (row) => (
        <span className="text-3xl font-black text-blue-600">
          ₹{parseFloat(row.total_amount).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "Profit",
      cell: (row) => (
        <span className="text-3xl font-black text-green-600">
          ₹{parseFloat(row.total_profit).toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* HEADER */}
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>Sales Analytics</h3>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">Dashboard</Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">Reports</Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">Sales Analytics</div>
              </li>
            </ul>
          </div>

          {/* SUMMARY CARDS */}
          <SummaryCards summary={summary} />

          {/* FILTER PANEL */}
          <div className="wg-box mb-6 shadow-lg rounded-2xl p-6 border border-slate-200">
            <h5 className="text-2xl font-extrabold text-slate-800">Filters</h5>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <FilterField label="Start Date">
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField label="End Date">
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                />
              </FilterField>

              <FilterField label="Branch">
                <select
                  className="..."
                  value={filters.branch_id}
                  onChange={(e) =>
                    setFilters({ ...filters, branch_id: e.target.value })
                  }
                >
                  <option value="">All Branches</option>
                  {branch.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <div className="flex items-end">
                <button
                  onClick={fetchReport}
                  className="bg-green-600 text-white w-full h-[55px] text-2xl font-bold rounded-xl shadow-md"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={exportCSV}
                  className="bg-green-500 text-white w-full h-[55px] text-2xl font-bold rounded-xl shadow-md mr-4 hover:bg-green-700"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="bg-red-500 text-white w-full h-[55px] text-2xl font-bold rounded-xl shadow-md hover:bg-red-700"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* DATE-WISE TABLE */}
          <div className="wg-box shadow-xl rounded-2xl overflow-hidden border border-slate-200 mt-8">
            <DataTable
              title={
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                  Daily Sales Summary
                </h2>
              }
              columns={summaryColumns}
              data={summary}
              pagination
              highlightOnHover
              progressPending={loading}
              customStyles={customTableStyles}
            />
          </div>

          {/* HOURLY SALES */}
          {Object.keys(hourly).length > 0 && <HeatmapCard hourly={hourly} />}

          {/* TOP / SLOW PRODUCTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
            <ListCard title="Top Products" items={topProducts} type="top" />
            <ListCard
              title="Slow Moving Products"
              items={slowProducts}
              type="slow"
            />
          </div>

          {/* PAYMENT METHODS */}
          <PaymentMethodsCard payment={paymentMethods} />

          {/* HIGH/LOW SALES */}
          <HighLowCards highest={highestSale} lowest={lowestSale} />

          {/* BRANCH PERFORMANCE */}
          <BranchPerformanceCard branches={branchPerformance} />

          {/* BRAND SALES */}
          <BrandSalesCard brandSales={brandSales} />
        </div>
      </div>
    </Layout>
  );
};

/* COMPONENTS */
const FilterField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-2xl font-bold text-slate-500 uppercase tracking-wide mb-1">
      {label}
    </label>
    {React.cloneElement(children, {
      className:
        "w-full h-[55px] bg-white border border-slate-300 rounded-xl px-4 text-2xl font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none shadow-sm",
    })}
  </div>
);

const SummaryCards = ({ summary }) => {
  const totals = summary.reduce(
    (t, row) => ({
      bills: t.bills + row.bills,
      taxable: t.taxable + parseFloat(row.total_taxable || 0),
      gst: t.gst + parseFloat(row.total_gst || 0),
      net: t.net + parseFloat(row.total_amount || 0),
      profit: t.profit + parseFloat(row.total_profit || 0),
    }),
    { bills: 0, taxable: 0, gst: 0, net: 0, profit: 0 },
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <StatCard label="Bills" value={totals.bills} />
      <StatCard
        label="Taxable"
        value={`₹${totals.taxable.toLocaleString("en-IN")}`}
      />
      <StatCard label="GST" value={`₹${totals.gst.toLocaleString("en-IN")}`} />
      <StatCard
        label="Net Sales"
        value={`₹${totals.net.toLocaleString("en-IN")}`}
      />
      <StatCard
        label="Profit"
        value={`₹${totals.profit.toLocaleString("en-IN")}`}
      />
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(30,64,175,0.25)] flex items-center gap-5 transform hover:scale-[1.02] transition">
    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
      <div className="text-3xl">{icon}</div>
    </div>

    <div>
      <div className="text-xl uppercase tracking-widest font-bold opacity-90">
        {label}
      </div>
      <div className="text-4xl font-extrabold tracking-tight mt-1">{value}</div>
    </div>
  </div>
);

const HeatmapCard = ({ hourly }) => (
  <div className="wg-box p-6 rounded-2xl bg-white mt-8 border">
    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
      Hourly Sales Pattern
    </h2>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(hourly).map(([hour, sale]) => (
        <div
          key={hour}
          className="bg-indigo-50 p-5 rounded-2xl border flex flex-col items-center"
        >
          <div className="text-4xl font-black text-yellow-600">{hour}:00</div>
          <div className="text-5xl font-bold text-green-600 mt-2">
            ₹{parseFloat(sale).toLocaleString("en-IN")}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ListCard = ({ title, items, type }) => (
  <div className="wg-box p-6 rounded-2xl border">
    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
      {title}
    </h2>
    <ul className="space-y-3">
      {items.map((p) => (
        <li
          key={p.id}
          className="bg-slate-100 p-4 rounded-xl text-2xl font-semibold flex justify-between"
        >
          <span>{p.name}</span>
          <span>
            {type === "top" ? `${p.total_qty} pcs` : `${p.sold_qty} pcs`}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const PaymentMethodsCard = ({ payment }) => (
  <div className="wg-box mt-8 p-6 rounded-2xl border">
    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
      Payment Method Summary
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.entries(payment).map(([method, amount]) => (
        <div
          key={method}
          className="bg-yellow-200 p-6 rounded-2xl text-2xl font-bold flex justify-between"
        >
          <span className="uppercase">{method}</span>
          <span>₹{parseFloat(amount).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  </div>
);

const HighLowCards = ({ highest, lowest }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
    {/* Highest Sale Day */}
    <div
      className="relative p-8 rounded-3xl overflow-hidden
               bg-gradient-to-br from-green-50 via-emerald-100 to-green-200
               shadow-[0_8px_30px_rgba(16,185,129,0.15)]
               border border-green-200
               transition-all duration-300 hover:shadow-[0_12px_40px_rgba(16,185,129,0.25)]"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-emerald-300/20 blur-2xl opacity-0 hover:opacity-60 transition-all duration-500"></div>

      <div className="relative z-10">
        <h4
          className="text-3xl font-extrabold uppercase tracking-wider
                     bg-gradient-to-r from-green-700 to-emerald-600 
                     bg-clip-text text-transparent"
        >
          Highest Sale Day
        </h4>

        <div className="text-2xl font-bold text-green-900 mt-4">
          {highest?.date}
        </div>

        <div
          className="text-5xl font-black mt-2 
                      bg-gradient-to-r from-green-700 to-emerald-600 
                      bg-clip-text text-transparent"
        >
          ₹{parseFloat(highest?.sales || 0).toLocaleString("en-IN")}
        </div>
      </div>
    </div>

    {/* Lowest Sale Day */}
    <div
      className="relative p-8 rounded-3xl overflow-hidden
               bg-gradient-to-br from-rose-50 via-red-100 to-rose-200
               shadow-[0_8px_30px_rgba(244,63,94,0.15)]
               border border-red-200
               transition-all duration-300 hover:shadow-[0_12px_40px_rgba(244,63,94,0.25)]"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-red-300/20 blur-2xl opacity-0 hover:opacity-60 transition-all duration-500"></div>

      <div className="relative z-10">
        <h4
          className="text-3xl font-extrabold uppercase tracking-wider
                     bg-gradient-to-r from-red-700 to-rose-600
                     bg-clip-text text-transparent"
        >
          Lowest Sale Day
        </h4>

        <div className="text-2xl font-bold text-red-900 mt-4">
          {lowest?.date}
        </div>

        <div
          className="text-5xl font-black mt-2 
                      bg-gradient-to-r from-red-700 to-rose-600 
                      bg-clip-text text-transparent"
        >
          ₹{parseFloat(lowest?.sales || 0).toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  </div>
);

const BranchPerformanceCard = ({ branches }) => (
  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-6 mt-10 border border-slate-200">
    <h2 className="text-3xl font-bold text-slate-800 mb-5 tracking-tight">
      Branch Performance
    </h2>

    <table className="w-full text-2xl overflow-hidden rounded-sm">
      <thead
        className="bg-gradient-to-r from-slate-200 to-slate-300
                 text-slate-800 uppercase tracking-wide"
      >
        <tr>
          <th className="p-4 text-left font-extrabold">Branch</th>
          <th className="p-4 text-center font-extrabold">Bills</th>
          <th className="p-4 text-right font-extrabold">Sales</th>
          <th className="p-4 text-right font-extrabold">Profit</th>
        </tr>
      </thead>

      <tbody>
        {branches.map((b, i) => (
          <tr
            key={i}
            className="border-b hover:bg-indigo-50 hover:shadow-sm
                     transition-all duration-200"
          >
            <td className="p-4 font-bold text-slate-900">{b.branch}</td>

            <td className="p-4 text-center font-semibold text-slate-800">
              {b.bills}
            </td>

            <td className="p-4 text-right font-extrabold text-indigo-700">
              ₹{parseFloat(b.sales).toLocaleString("en-IN")}
            </td>

            <td className="p-4 text-right font-extrabold text-green-700">
              ₹{parseFloat(b.profit).toLocaleString("en-IN")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BrandSalesCard = ({ brandSales }) => (
  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-6 mt-10 border border-slate-200">
    <h2 className="text-3xl font-bold text-slate-800 mb-5 tracking-tight">
      Brand Wise Sales
    </h2>

    <table className="w-full text-2xl overflow-hidden rounded-sm">
      <thead
        className="bg-gradient-to-r from-slate-200 to-slate-300
                 text-slate-800 uppercase tracking-wide"
      >
        <tr>
          <th className="p-4 text-left font-extrabold">Brand</th>
          <th className="p-4 text-center font-extrabold">Qty</th>
          <th className="p-4 text-right font-extrabold">Amount</th>
        </tr>
      </thead>

      <tbody>
        {brandSales.map((b) => (
          <tr
            key={b.id}
            className="border-b hover:bg-indigo-50 hover:shadow-sm
                     transition-all duration-200"
          >
            <td className="p-4 font-bold text-slate-900">{b.name}</td>

            <td className="p-4 text-center font-semibold text-slate-800">
              {b.qty}
            </td>

            <td className="p-4 text-right font-extrabold text-indigo-700">
              ₹{parseFloat(b.amount).toLocaleString("en-IN")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const customTableStyles = {
  headRow: {
    style: {
      backgroundColor: "#F1F5F9",
      minHeight: "65px",
      borderBottom: "2px solid #E2E8F0",
    },
  },
  headCells: {
    style: {
      fontWeight: 900,
      fontSize: "15px",
      textTransform: "uppercase",
      color: "#334155",
      letterSpacing: "1px",
    },
  },
  rows: {
    style: {
      minHeight: "85px",
      fontSize: "16px",
      fontWeight: 600,
      borderBottom: "1px solid #F1F5F9",
      backgroundColor: "#FFFFFF",
    },
    highlightOnHoverStyle: {
      backgroundColor: "#F8FAFF",
      color: "#000",
      transitionDuration: "0.2s",
      borderBottomColor: "#E2E8F0",
    },
  },
};

export default SalesAnalytics;
