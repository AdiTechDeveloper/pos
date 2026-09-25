import React, { useEffect, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import Layout from "../layout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Link } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";
import { RefreshCw, FileSpreadsheet, FileDown } from "lucide-react";



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
        <div className="text-xl font-bold text-slate-800">{row.date}</div>
      ),
    },
    {
      name: "Bills",
      selector: (row) => row.bills,
      center: true,
      cell: (row) => (
        <span className="text-xl font-semibold text-slate-800">{row.bills}</span>
      ),
    },
    {
      name: "Taxable",
      selector: (row) => row.total_taxable,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl font-semibold text-blue-700">
          ₹{parseFloat(row.total_taxable).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "GST",
      selector: (row) => row.total_gst,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl font-semibold text-purple-700">
          ₹{parseFloat(row.total_gst).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "Net",
      selector: (row) => row.total_amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl font-bold text-blue-700">
          ₹{parseFloat(row.total_amount).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "Profit",
      selector: (row) => row.total_profit,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-xl font-bold text-emerald-700">
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
                    Sales Analytics
                  </h3>

                </div>
              </div>

            </div>
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
          <div className="wg-box mt-6  mb-6 shadow-lg rounded-2xl p-6 border border-slate-200 w-full">
            {/* <h5 className="text-2xl font-extrabold text-slate-800">Filters</h5> */}

            <div className="flex justify-between items-end gap-4 w-full">
              <div className="flex items-end gap-4">
                <div className="shrink-0">
                  <FilterField label="Start Date">
                    <input
                      type="date"
                      name="start_date"
                      value={filters.start_date}
                      onChange={handleFilterChange}
                      className="border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </FilterField>
                </div>

                <div className="shrink-0">
                  <FilterField label="End Date">
                    <input
                      type="date"
                      name="end_date"
                      value={filters.end_date}
                      onChange={handleFilterChange}
                      className="border border-slate-300 rounded-lg p-2 text-sm"
                    />
                  </FilterField>
                </div>

                <div className="shrink-0">
                  <FilterField label="Branch">
                    <select
                      className="border border-slate-300 rounded-lg p-2 text-sm bg-white min-w-[140px]"
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
                </div>

                <button
                  onClick={fetchReport}
                  title={loading ? "Loading..." : "Refresh"}
                  className="flex items-center justify-center bg-green-600 text-white h-[40px] w-[40px] rounded-xl shadow-md hover:bg-green-700 transition-colors shrink-0 mb-[2px]"
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={21} />
                </button>
              </div>

              <div className="flex items-end gap-4 shrink-0 mb-[2px]">
                <button
                  onClick={exportCSV}
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

const STAT_GRADIENTS = {
  quantity: "bg-blue-50 text-black-700 border-blue-200 ",
  gross: "bg-amber-50 text-amber-700 border-amber-200",
  cost: "bg-emerald-50 text-emerald-700 border-emerald-200",
  tax: "bg-teal-50 text-teal-700 border-teal-200",
  profit: "bg-rose-50 text-rose-700 border-rose-200",
  collected: "from-teal-500 to-cyan-600",
  outstanding: "from-rose-500 to-red-600",
};

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
    <div className="grid grid-cols-1 md:grid-cols-8 gap-4 mb-6 text-center">
      <StatCard label="Bills" value={totals.bills} variant="quantity" />
      <StatCard
        label="Taxable"
        value={`₹${totals.taxable.toLocaleString("en-IN")}`}
        variant="gross"
      />
      <StatCard
        label="GST"
        value={`₹${totals.gst.toLocaleString("en-IN")}`}
        variant="tax"
      />
      <StatCard
        label="Net Sales"
        value={`₹${totals.net.toLocaleString("en-IN")}`}
        variant="gross"
      />
      <StatCard
        label="Profit"
        value={`₹${totals.profit.toLocaleString("en-IN")}`}
        variant="profit"
      />
    </div>
  );
};
const StatCard = ({ label, value, icon, variant = "quantity" }) => (
  <div
    className={`bg-gradient-to-br ${STAT_GRADIENTS[variant] || STAT_GRADIENTS.quantity} text-center justify-center p-6 rounded-3xl shadow-[0_8px_30px_rgba(30,64,175,0.25)] flex items-center gap-5 transform hover:scale-[1.02] transition`}
  >

    <div>
      <div className="text-2xl tracking-widest font-bold opacity-90">
        {label}
      </div>
      <div className="text-3xl font-extrabold text-center tracking-tight mt-1">{value}</div>
    </div>
  </div>
);
const HeatmapCard = ({ hourly }) => (
  <div className="wg-box p-6 rounded-2xl bg-white mt-8 border">
    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
      Hourly Sales Pattern
    </h2>

    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {Object.entries(hourly).map(([hour, sale]) => (
        <div
          key={hour}
          className="bg-amber-50 p-5 rounded-2xl border flex flex-col items-center"
        >
          <div className="text-2xl font-black text-yellow-600">{hour}:00</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
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

    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {Object.entries(payment).map(([method, amount]) => (
        <div
          key={method}
          className="bg-emerald-200 text-emerald-700 p-6 rounded-2xl text-2xl font-bold flex justify-between"
        >
          <span className="uppercase">{method}</span>
          <span>₹{parseFloat(amount).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  </div>
);

const HighLowCards = ({ highest, lowest }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-10 ">
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

      <div className="relative z-10 flex items-center justify-between">
        <h4
          className="text-3xl font-extrabold  tracking-wider
                     bg-gradient-to-r from-green-700 to-emerald-600 
                     bg-clip-text text-transparent"
        >
          Highest Sale Day
        </h4>
         <h3 className="text-2xl font-bold text-green-900 mt-4">
           {highest?.date}
        </h3>
      </div>
        <div
          className="text-4xl font-black mt-2 
                      bg-gradient-to-r from-green-700 to-emerald-600 
                      bg-clip-text text-transparent"
        >
          ₹{parseFloat(highest?.sales || 0).toLocaleString("en-IN")}
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

      <div className="relative z-10 flex items-center justify-between">
        <h4
          className="text-3xl font-extrabold tracking-wider
               bg-gradient-to-r from-red-700 to-rose-600
               bg-clip-text text-transparent"
        >
          Lowest Sale Day
        </h4>

        <h3 className="text-2xl font-bold text-red-900">
          {lowest?.date}
        </h3>
      </div>

      <div
        className="text-4xl font-black mt-4 
                      bg-gradient-to-r from-red-700 to-rose-600 
                      bg-clip-text text-transparent"
      >
        ₹{parseFloat(lowest?.sales || 0).toLocaleString("en-IN")}
      </div>
    </div>
  </div>
  // </div>
);

const BranchPerformanceCard = ({ branches }) => {
  const columns = [
    {
      name: "Branch",
      selector: (row) => row.branch,
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-slate-900 text-2xl">
          {row.branch}
        </span>
      ),
      grow: 2,
    },
    {
      name: "Bills",
      selector: (row) => row.bills,
      sortable: true,
      center: true,
      cell: (row) => (
        <span className="font-semibold text-slate-800 text-2xl">
          {row.bills}
        </span>
      ),
    },
    {
      name: "Sales",
      selector: (row) => parseFloat(row.sales || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-extrabold text-indigo-700 text-2xl">
          ₹{parseFloat(row.sales || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "Profit",
      selector: (row) => parseFloat(row.profit || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-extrabold text-green-700 text-2xl">
          ₹{parseFloat(row.profit || 0).toLocaleString("en-IN")}
        </span>
      ),
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
          "linear-gradient(to right, rgb(152, 181, 219), rgb(182, 211, 246))",
        minHeight: "65px",
        borderBottom: "1px solid rgb(203, 213, 225)",
      },
    },

    headCells: {
      style: {
        fontSize: "18px",
        fontWeight: "800",
        color: "rgb(30, 41, 59)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      },
    },

    rows: {
      style: {
        minHeight: "70px",
        borderBottom: "1px solid rgb(226, 232, 240)",
        transition: "all 0.2s ease",
      },

      highlightOnHoverStyle: {
        backgroundColor: "rgb(238, 242, 255)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        cursor: "pointer",
      },
    },

    cells: {
      style: {
        fontSize: "20px",
        padding: "12px 16px",
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
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-6 mt-10 border border-slate-200">

      <h2 className="text-3xl font-bold text-slate-800 mb-5 tracking-tight">
        Branch Performance
      </h2>

      <DataTable
        columns={columns}
        data={branches || []}
        customStyles={customStyles}
        pagination
        paginationPerPage={10}
        paginationRowsPerPageOptions={[5, 10, 20, 50]}
        highlightOnHover
        responsive
        striped
        persistTableHead
        noDataComponent={
          <div className="py-10 text-xl font-semibold text-slate-500">
            No branch data available
          </div>
        }
      />
    </div>
  );
};

const BrandSalesCard = ({ brandSales }) => {
  const columns = [
    {
      name: "Brand",
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-slate-900 text-2xl">
          {row.name}
        </span>
      ),
      grow: 2,
    },
    {
      name: "Qty",
      selector: (row) => Number(row.qty || 0),
      sortable: true,
      center: true,
      cell: (row) => (
        <span className="font-semibold text-slate-800 text-2xl">
          {row.qty}
        </span>
      ),
    },
    {
      name: "Amount",
      selector: (row) => parseFloat(row.amount || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-extrabold text-indigo-700 text-2xl">
          ₹{parseFloat(row.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
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
          "linear-gradient(to right, rgb(189, 209, 236), rgb(166, 198, 237))",
        minHeight: "65px",
        borderBottom: "1px solid rgb(203, 213, 225)",
      },
    },

    headCells: {
      style: {
        fontSize: "20px",
        fontWeight: "800",
        color: "rgb(30, 41, 59)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      },
    },

    rows: {
      style: {
        minHeight: "70px",
        borderBottom: "1px solid rgb(226, 232, 240)",
        transition: "all 0.2s ease",
      },

      highlightOnHoverStyle: {
        backgroundColor: "rgb(238, 242, 255)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        cursor: "pointer",
      },
    },

    cells: {
      style: {
        fontSize: "22px",
        padding: "12px 16px",
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
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] p-6 mt-10 border border-slate-200">

      <h2 className="text-3xl font-bold text-slate-800 mb-5 tracking-tight">
        Brand Wise Sales
      </h2>

      <DataTable
        columns={columns}
        data={brandSales || []}
        customStyles={customStyles}
        pagination
        paginationPerPage={10}
        paginationRowsPerPageOptions={[5, 10, 20, 50]}
        highlightOnHover
        responsive
        striped
        persistTableHead
        noDataComponent={
          <div className="py-10 text-xl font-semibold text-slate-500">
            No brand sales data available
          </div>
        }
      />

    </div>
  );
};

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
      fontSize: "20px",
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
