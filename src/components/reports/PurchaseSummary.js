import React, { useEffect, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";

const PurchaseSummary = () => {
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
    group_by: "product",
    supplier_id: "",
    brand_id: "",
    product_id: "",
    branch_id: "",
    include_bills: false,
  });

  const [reportData, setReportData] = useState([]);
  const [taxSlabs, setTaxSlabs] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ taxable: 0, gst: 0, net: 0, qty: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [branch, setbranch] = useState([]);
  const [products, setProducts] = useState([]);

  const exportPDF = () => {
    if (!reportData.length) {
      alert("No data available to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("Purchase Summary Report", 14, 15);
    const tableRows = reportData.map((row) => [
      row.label,
      row.total_qty,
      row.total_taxable,
      row.total_gst,
      row.total_amount,
    ]);

    autoTable(doc, {
      head: [["Analysis", "Qty", "Taxable", "GST", "Net Amount"]],
      body: tableRows,
      startY: 25,
    });

    doc.save("purchase-summary.pdf");
  };

  const exportCSV = () => {
    if (!reportData.length) {
      alert("No data available to export");
      return;
    }
    const headers = ["Analysis", "Quantity", "Taxable", "GST", "Net Amount"];
    const rows = reportData.map((row) => [
      row.label,
      row.total_qty,
      row.total_taxable,
      row.total_gst,
      row.total_amount,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "purchase-summary.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    appData?.loadSuppliers();
    appData?.loadBrands();
  }, []);

  useEffect(() => {
    setSuppliers(appData?.suppliers || []);
  }, [appData?.suppliers]);

  useEffect(() => {
    setBrands(appData?.brands || []);
  }, [appData?.brands]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const prod = await axios.get(`${BASE_URL}/api/products`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        });

        setProducts(
          Array.isArray(prod.data.products) ? prod.data.products : [],
        );
      } catch (err) {
        console.error("Dropdown Load Error:", err);
      }
    };

    loadDropdowns();
  }, []);

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
        `${BASE_URL}/api/reports/purchase`,
        filters,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      const report = response.data.report || [];
      setReportData(report);
      setTaxSlabs(response.data.tax_slabs || []);
      setBills(response.data.bills || []);

      const t = report.reduce(
        (acc, curr) => ({
          taxable: acc.taxable + parseFloat(curr.total_taxable || 0),
          gst: acc.gst + parseFloat(curr.total_gst || 0),
          net: acc.net + parseFloat(curr.total_amount || 0),
          qty: acc.qty + parseFloat(curr.total_qty || 0),
        }),
        { taxable: 0, gst: 0, net: 0, qty: 0 },
      );

      setTotals(t);
    } catch (error) {
      console.error("Purchase Report Error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
    fetchBrach();
  }, [fetchReport]);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const columns = [
    {
      name: "Analysis",
      selector: (row) => row.label,
      grow: 2,
      cell: (row) => (
        <div className="py-2">
          <div className="text-2xl font-extrabold text-slate-900">
            {row.label}
          </div>
          {row.label_id && (
            <div className="text-2xl uppercase font-bold text-blue-600 mt-1 tracking-wider">
              Ref #{row.label_id}
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Qty",
      selector: (row) => row.total_qty,
      center: true,
      cell: (row) => (
        <span className="text-2xl font-black text-slate-800">
          {row.total_qty}
        </span>
      ),
    },
    {
      name: "Value",
      grow: 3,
      cell: (row) => (
        <div className="flex gap-6 items-center p-2">
          <div>
            <div className="text-xl uppercase font-bold text-green-600">
              Taxable
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              ₹{parseFloat(row.total_taxable).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200" />

          <div>
            <div className="text-xl uppercase font-bold text-blue-600">GST</div>
            <div className="text-3xl font-extrabold text-yellow-600">
              ₹{parseFloat(row.total_gst).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "Net Amount",
      selector: (row) => row.total_amount,
      right: true,
      cell: (row) => (
        <div className="bg-yellow-600 text-white px-6 py-3 rounded-xl text-2xl font-extrabold shadow-[0_4px_18px_rgba(0,0,0,0.25)]">
          ₹{parseFloat(row.total_amount).toLocaleString("en-IN")}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>Purchase Summury</h3>
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
                <div className="text-tiny">Purchase Summury</div>
              </li>
            </ul>
          </div>

          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total Units" value={totals.qty} />
            <StatCard
              label="Taxable Value"
              value={`₹${totals.taxable.toLocaleString("en-IN")}`}
            />
            <StatCard
              label="GST Amount"
              value={`₹${totals.gst.toLocaleString("en-IN")}`}
              color="text-blue-600"
            />
            <StatCard
              label="Net Purchase"
              value={`₹${totals.net.toLocaleString("en-IN")}`}
              highlight
            />
          </div>

          {/* FILTERS PANEL */}
          <div className="wg-box mb-6 shadow-lg rounded-2xl p-6 border border-slate-200">
            <div className="flex justify-between mb-4 pb-3 border-b border-slate-200">
              <h5 className="text-2xl font-extrabold text-slate-800">
                Filters
              </h5>

              <label className="flex items-center gap-2 text-2xl font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="include_bills"
                  checked={filters.include_bills}
                  onChange={handleFilterChange}
                  className="w-5 h-5"
                />
                Include Bills
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <FilterField label="Group By">
                <select
                  name="group_by"
                  value={filters.group_by}
                  onChange={handleFilterChange}
                >
                  <option value="date">By Date</option>
                  <option value="supplier">By Supplier</option>
                  <option value="brand">By Brand</option>
                  <option value="product">By Product</option>
                  <option value="gst">By GST Rate</option>
                </select>
              </FilterField>

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

              <FilterField label="Supplier">
                <select
                  className="..."
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
              </FilterField>

              <FilterField label="Brand">
                <select
                  className="..."
                  value={filters.brand_id}
                  onChange={(e) =>
                    setFilters({ ...filters, brand_id: e.target.value })
                  }
                >
                  <option value="">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Product">
                <select
                  className="..."
                  value={filters.product_id}
                  onChange={(e) =>
                    setFilters({ ...filters, product_id: e.target.value })
                  }
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
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
                  className="bg-green-600 text-white text-2xl font-bold w-full h-[48px] rounded-xl hover:bg-blue-700 shadow-md"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="flex items-end ">
                <button
                  onClick={exportCSV}
                  className="bg-green-500 text-white text-2xl font-bold px-4 h-[48px] mr-4 rounded-xl hover:bg-green-700 shadow-md"
                >
                  Export CSV
                </button>

                <button
                  onClick={exportPDF}
                  className="bg-red-500 text-white text-2xl font-bold px-4 h-[48px] rounded-xl hover:bg-red-700 shadow-md"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* MAIN DATA TABLE */}
          <div className="wg-box shadow-xl rounded-2xl overflow-hidden border border-slate-200">
            <DataTable
              columns={columns}
              data={reportData}
              pagination
              highlightOnHover
              progressPending={loading}
              customStyles={customTableStyles}
            />
          </div>

          {/* TAX SLABS */}
          {taxSlabs.length > 0 && (
            <div className="flex flex-wrap gap-8 mb-10 mt-5">
              {taxSlabs.map((slab, i) => (
                <div className="bg-white p-6 rounded-3xl shadow-[0_4px_18px_rgba(0,0,0,0.07)] border border-slate-200">
                  <div className="text-3xl font-black text-yellow-600 uppercase tracking-widest">
                    GST {slab.slab_name}%
                  </div>
                  <div className="text-4xl font-extrabold text-gray-900 mt-2">
                    ₹{parseFloat(slab.gst).toLocaleString("en-IN")}
                  </div>
                  <div className="text-2xl font-bold text-slate-500 mt-1">
                    On ₹{parseFloat(slab.taxable).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BILLS TABLE */}
          {filters.include_bills && bills.length > 0 && (
            <table className="table font-medium text-2xl">
              <thead className="bg-slate-100">
                <tr className="uppercase text-2xl tracking-wider text-slate-800">
                  <th className="p-3">Date</th>
                  <th>Bill No</th>
                  <th>Supplier</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {bills.map((bill, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 text-2xl font-bold">{bill.bill_date}</td>
                    <td className="font-bold text-blue-600">{bill.bill_no}</td>
                    <td className="font-bold text-2xl text-slate-700">
                      {bill.supplier_name}
                    </td>
                    <td className="text-right text-3xl font-black text-slate-900">
                      ₹{parseFloat(bill.total_amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="bg-gradient-to-br from-pink-500 to-blue-400 text-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(30,64,175,0.25)] flex items-center gap-5 transform hover:scale-[1.02] transition">
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

export default PurchaseSummary;
