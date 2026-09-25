import React, { useEffect, useState, useRef, useCallback } from "react";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import axios from "axios";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";
import { TrendingUp, TrendingDown, Sparkles, Minus , HeartHandshake } from "lucide-react";
import { RefreshCw, FileSpreadsheet, FileDown , Star , TriangleAlert} from "lucide-react";
import { Skull, Zap, Hourglass, ShieldCheck ,  LayersPlus } from "lucide-react";

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
  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 1,
    lastPage: 1,
    totalRecords: 0,
    perPage: 20,
  });

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
            className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
            icon: <TrendingUp size={20} />,
          },
          down: {
            label: "Dropping",
            className: "bg-rose-50 text-rose-700 border border-rose-200",
            icon: <TrendingDown size={20} />,
          },
          new: {
            label: "New Arrival",
            className: "bg-green-50 text-green-700 border border-green-200",
            icon: <LayersPlus size={20} />,
          },
        };
        const style = config[row.trend] || {
          label: "Stable",
          className: "bg-gray-100 text-gray-600 border border-gray-200",
          icon: <HeartHandshake size={20} />,
        };

        return (
          <span
            title={style.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${style.className}`}
          >
            {style.icon}
            {/* {style.label} */}
          </span>
        );
      },
    },
        {
      name: "Stock Health",
      grow: 1.5,
      cell: (row) => {
               if (row.dead_stock) {
          return (
            <span
              title="Dead Stock"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-white rounded-full text-xs font-medium bg-red-500 border border-red-600"
            >
              <TriangleAlert size={20} />
             
            </span>
          );
        }
        const health = {
          fast_moving: {
            className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
            icon: <Zap size={20} />,
            label: "Fast Moving",
          },
          slow_moving: {
            className: "bg-amber-50 text-amber-700 border border-amber-200",
            icon: <Hourglass size={20} />,
            label: "Slow Moving",
          },
          normal: {
            className: "bg-green-100 text-white-700 border border-blue-200",
            icon: <ShieldCheck size={20} />,
            label: "Healthy",
          },
        };
        const h = health[row.stock_health] || health.normal;

        return (
          <span
            title={h.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${h.className}`}
          >
            {h.icon}
            {/* {h.label} */}
          </span>
        );
      },
    },
  ];

  const fetchStockSummury = useCallback(
    async (currentPage = 1, requestedPerPage = paginationInfo.perPage) => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${BASE_URL}/api/reports/stock-summary`,
          {
            params: {
              page: currentPage,
              per_page: requestedPerPage,
              start_date: filters.start_date,
              end_date: filters.end_date,
              branch_id: filters.branch_id,
              search: search.trim(),
            },
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${user_data.token}`,
            },
          },
        );

        const data = response.data.data || [];
        const pagination = response.data.pagination || {};

        setStockSummury(data);
        setFilteredData(data);

        setPaginationInfo({
          currentPage: pagination.current_page,
          lastPage: pagination.last_page,
          totalRecords: pagination.total,
          perPage: pagination.per_page || requestedPerPage,
        });
      } catch (error) {
        console.error("Error fetching stock summary:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters, BASE_URL, user_data.token, search, paginationInfo.perPage],
  );

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
            {/* <h5 className="text-2xl font-extrabold text-slate-800">Filters</h5> */}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
                  title={loading ? "Loading..." : "Refresh"}
                  className="flex items-center justify-center bg-green-600 text-white h-[55px] w-[55px] rounded-xl shadow-md hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={22} />
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
                  title="Export as CSV"
                  className="flex items-center justify-center bg-green-600 text-white h-[48px] w-[48px] rounded hover:bg-green-700"
                >
                  <FileSpreadsheet size={20} />
                </CSVLink>

                <button
                  onClick={exportPDF}
                  title="Export as PDF"
                  className="flex items-center justify-center bg-red-600 text-white h-[48px] w-[48px] rounded hover:bg-red-700"
                >
                  <FileDown size={20} />
                </button>
              </div>

            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              paginationServer
              paginationTotalRows={paginationInfo.totalRecords}
              paginationPerPage={paginationInfo.perPage}
              paginationDefaultPage={paginationInfo.currentPage}
              paginationRowsPerPageOptions={[10, 20, 50, 100]}
              onChangePage={(page) => fetchStockSummury(page)}
              onChangeRowsPerPage={(newPerPage) => {
                setPaginationInfo((prev) => ({
                  ...prev,
                  perPage: newPerPage,
                  currentPage: 1,
                }));
                fetchStockSummury(1, newPerPage);
              }}
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
