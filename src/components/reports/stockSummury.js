import React, { useEffect, useState, useRef, useCallback } from "react";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import axios from "axios";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";

const StockSummury = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [search, setSearch] = useState("");
  const [stockSummury, setStockSummury] = useState([]);
  const [filteredData, setFilteredData] = useState(stockSummury);
  const scanTimer = useRef(null);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const appData = useAppData();
  const branch = appData?.branches || [];
  const [loading, setLoading] = useState(false);

  const formatStockData = (data) => {
    return data.map((row) => ({
      ...row,
      barcode: row.barcode ? `'${row.barcode}` : "",
      opening_stock: row.opening_stock || 0,
      closing_stock: row.closing_stock || 0,
    }));
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Stock Summary Report", 14, 15);

    const tableBody = filteredData.map((row) => [
      row.id || "N/A",
      row.product_name || "N/A",
      row.purchased || 0,
      row.sold || 0,
      row.closing_stock || 0,
      row.health_status || "N/A",
    ]);

    autoTable(doc, {
      startY: 20,
      head: [
        ["ID", "Product Name", "Purchased", "Sold", "Closing Stock", "Status"],
      ],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 10 },
    });
    doc.save("stock_summary.pdf");
  };

  const [filters, setFilters] = useState({
    start_date: (() => {
      const d = new Date();
      d.setDate(1);
      return d.toLocaleDateString("en-CA");
    })(),
    end_date: new Date().toLocaleDateString("en-CA"),
    branch_id: "",
  });

  const fetchBrach = () => {
    appData?.loadBranches();
  };

  const columns = [
    {
      name: "ID",
      selector: (row) => row.product_id,
      sortable: true,
      width: "100px",
      cell: (row) => (
        <div className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200 shadow-sm">
          <span className="text-gray-500 font-mono text-2xl font-bold">
            #{row.product_id}
          </span>
        </div>
      ),
    },
    {
      name: "Product Name",
      selector: (row) => row.product_name,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {/* Abstract Product Icon Placeholder */}
          <div className="flex flex-col">
            <span className="font-black text-gray-700 text-2xl">
              {row.product_name}
            </span>
            <span className="text-xl text-gray-400 font-bold uppercase tracking-widest opacity-70">
              Barcode: {row.barcode}
            </span>
          </div>
        </div>
      ),
    },
    {
      name: "Opening Stock",
      selector: (row) => row.opening_stock,
      sortable: true,
      center: true,
      cell: (row) => (
        <span className="text-3xl font-black text-slate-700 font-mono">
          {row.opening_stock}
        </span>
      ),
    },
    {
      name: "Stats (In/Out)",
      grow: 1,
      cell: (row) => (
        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Purchased
            </span>
            <span className="text-blue-600 font-black text-2xl">
              +{row.purchased}
            </span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Sold
            </span>
            <span className="text-orange-600 font-black text-2xl">
              -{row.sold}
            </span>
          </div>
        </div>
      ),
    },
    {
      name: "Closing Stock",
      selector: (row) => row.closing_stock,
      sortable: true,
      center: true,
      cell: (row) => {
        const isLow = row.closing_stock < 10;
        return (
          <div
            className={`relative px-6 py-2 rounded-2xl font-black text-2xl shadow-sm border-2 transition-all ${
              isLow
                ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                : "bg-emerald-50 border-emerald-100 text-emerald-700"
            }`}
          >
            {row.closing_stock}
            {isLow && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      name: "Sales Velocity",
      grow: 1.5,
      cell: (row) => (
        <div className="w-full px-2">
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-black text-gray-700">
              {row.sales_percentage}%
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Performance
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)] ${
                row.sales_percentage > 70
                  ? "bg-gradient-to-r from-blue-400 to-indigo-600"
                  : "bg-gradient-to-r from-slate-400 to-slate-600"
              }`}
              style={{ width: `${row.sales_percentage}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      name: "Trend",
      width: "140px",
      cell: (row) => {
        const config = {
          up: {
            label: "Surging",
            color: "bg-green-500 text-white",
            icon: "↗",
            shadow: "shadow-green-200",
          },
          down: {
            label: "Dropping",
            color: "bg-red-500 text-white",
            icon: "↘",
            shadow: "shadow-red-200",
          },
          new: {
            label: "New Arrival",
            color: "bg-blue-500 text-white",
            icon: "★",
            shadow: "shadow-blue-200",
          },
        };
        const style = config[row.trend] || {
          label: "Stable",
          color: "bg-gray-400 text-white",
          icon: "→",
          shadow: "shadow-gray-200",
        };

        return (
          <span
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-tighter shadow-lg ${style.color} ${style.shadow}`}
          >
            <span className="text-xl">{style.icon}</span> {style.label}
          </span>
        );
      },
    },
    {
      name: "Health Status",
      grow: 1.5,
      cell: (row) => {
        if (row.dead_stock) {
          return (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-red-100 rounded-xl shadow-xl rotate-1">
              <span className="text-xl font-black italic uppercase tracking-widest">
                Dead Stock
              </span>
            </div>
          );
        }
        const health = {
          fast_moving: {
            bg: "bg-emerald-500",
            text: "text-emerald-500",
            label: "Fast Moving",
          },
          slow_moving: {
            bg: "bg-amber-500",
            text: "text-amber-500",
            label: "Slow Moving",
          },
          normal: {
            bg: "bg-blue-500",
            text: "text-blue-500",
            label: "Healthy",
          },
        };
        const h = health[row.stock_health] || health.normal;

        return (
          <div className="flex items-center gap-3 bg-white border border-gray-100 p-2 pr-4 rounded-2xl shadow-sm">
            <div
              className={`w-3 h-3 rounded-full ${h.bg} animate-pulse shadow-[0_0_8px_currentColor] ${h.text}`}
            ></div>
            <span className={`text-xl font-black uppercase italic ${h.text}`}>
              {h.label}
            </span>
          </div>
        );
      },
    },
  ];

  const fetchStockSummury = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/api/reports/stock-summary`,
        {
          params: {
            start_date: filters.start_date,
            end_date: filters.end_date,
            branch_id: filters.branch_id,
          },
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );
      const data = response.data.data || [];
      setStockSummury(data);
      setFilteredData(data);
    } catch (error) {
      console.error("Error fetching stock summary:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, BASE_URL, user_data.token]);

  const handleBarcodeSearch = (value) => {
    if (!value) {
      setFilteredData(filteredData);
      return;
    }

    const result = filteredData.filter((item) => {
      return (
        item.product_name?.toLowerCase().includes(value.toLowerCase()) ||
        item.product_id?.toString() === value ||
        item.barcode?.toString() === value
      );
    });

    setFilteredData(result);
  };

  const handleChange = (e) => {
    setSearch(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  useEffect(() => {
    fetchStockSummury();
    fetchBrach();
  }, [fetchStockSummury]);

  useEffect(() => {
    if (user_data.role === "admin") fetchBrach();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      setFilteredData(stockSummury);
      return;
    }

    const result = stockSummury.filter((item) => {
      return (
        item.product_name?.toLowerCase().includes(searchText) ||
        item.barcode?.toString().includes(searchText) ||
        item.product_id?.toString().includes(searchText) ||
        item.stock_health?.toLowerCase().includes(searchText)
      );
    });
    setFilteredData(result);
  }, [search, stockSummury]);

  useEffect(() => {
    const searchText = search.toLowerCase();

    const result = stockSummury.filter((item) => {
      const searchable = `
      ${item.product_id}
      ${item.product_name}
      ${item.barcode}
      ${item.opening_stock}
      ${item.purchased}
      ${item.sold}
      ${item.closing_stock}
      ${item.sales_percentage}
      ${item.last_month_sold}
      ${item.trend}
      ${item.stock_health}
      ${item.dead_stock ? "dead" : ""}
    `.toLowerCase();

      return searchable.includes(searchText);
    });

    setFilteredData(result);
  }, [search, stockSummury]);

  return (
    <Layout>
      <div className="main-content-inner">
        {/* <!-- main-content-wrap --> */}
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>Stock Summury</h3>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">
                  <div className="text-tiny">Reports</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">Stock Summury</div>
              </li>
            </ul>
          </div>

          {/* FILTER PANEL */}
          <div className="wg-box mb-6 shadow-lg rounded-2xl p-6 border border-slate-200">
            <h5 className="text-2xl font-extrabold text-slate-800">Filters</h5>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  onClick={fetchStockSummury}
                  className=" bg-green-600 text-white w-full h-[55px] text-2xl font-bold rounded-xl shadow-md"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {/* <!-- all-user --> */}
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
                      placeholder="Scan or search product..."
                      value={search}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>

              {/* Buttons Container */}
              <div className="flex items-center gap-2">
                <CSVLink
                  data={formatStockData(filteredData)}
                  filename={"stock_summary.csv"}
                  className="px-4 py-4 bg-green-600 text-xl text-white rounded hover:bg-green-700 hover:text-white"
                >
                  Export CSV
                </CSVLink>

                <button
                  onClick={exportPDF}
                  className="px-4 py-4 bg-red-600 text-xl text-white rounded hover:bg-red-700 flex items-center gap-1 hover:text-white"
                >
                  <i className="icon-file-text"></i> Export PDF
                </button>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "16px",
                    color: "grey",
                  },
                },
              }}
            />
            <div className="divider"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const FilterField = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-xl font-bold text-slate-500 uppercase tracking-wide mb-1 ml-1">
      {label}
    </label>
    {React.cloneElement(children, {
      className: `w-full h-[55px] bg-white border border-slate-300 rounded-xl px-4 text-2xl font-semibold text-slate-900 outline-none shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${children.props.className || ""}`,
    })}
  </div>
);

export default StockSummury;
