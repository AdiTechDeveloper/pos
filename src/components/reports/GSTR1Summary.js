import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const tabs = [
  { id: "b2b", label: "B2B Supplies" },
  { id: "b2c_large", label: "B2C Large" },
  { id: "b2c_small", label: "B2C Small" },
];

const GSTR1Reports = () => {
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const token = user_data?.token;

  const [activeTab, setActiveTab] = useState("b2b");
  const appData = useAppData();
  const branchList = appData?.branches || [];
  const [loading, setLoading] = useState(false);

  const [allData, setAllData] = useState({
    b2b: [],
    b2c_large: [],
    b2c_small: [],
  });

  const [filters, setFilters] = useState({
    branch_id:
      user_data?.role?.toLowerCase() === "manager" ? user_data.branch_id : "",
    start_date: (() => {
      const d = new Date();
      d.setDate(1);
      return d.toLocaleDateString("en-CA");
    })(),
    end_date: new Date().toLocaleDateString("en-CA"),
  });

  useEffect(() => {
    appData?.loadBranches();
  }, [appData]);

  const loadReport = useCallback(async () => {
    if (!filters.start_date || !filters.end_date) return;
    setLoading(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/reports/gst/gstr1-Summary`,
        filters,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = res.data?.gstr1 || res.data;
      setAllData({
        b2b: data.b2b || [],
        b2c_large: data.b2c_large || [],
        b2c_small: data.b2c_small || [],
      });
    } catch (error) {
      console.error("GSTR1 Summary API Error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const columns = [
    {
      name: "Invoice Details",
      grow: 1.5,
      cell: (row) => (
        <div className="flex flex-col py-3">
          <span className="text-2xl font-black text-slate-800">
            {row.invoice_no || row.bill_no}
          </span>
          <span className="text-xl text-slate-400 font-bold uppercase">
            {row.date || row.invoice_date}
          </span>
        </div>
      ),
    },
    {
      name: "Taxable Value",
      cell: (row) => (
        <span className="text-3xl font-bold text-slate-600">
          ₹{parseFloat(row.taxable_value || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "Tax Breakdown",
      center: true,
      grow: 2,
      cell: (row) => (
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full justify-around">
          <div className="text-center border-r border-slate-200 pr-4">
            <p className="text-2xl text-slate-400 font-black uppercase">CGST</p>
            <p className="text-3xl text-blue-600 font-black">₹{row.cgst || 0}</p>
          </div>
          <div className="text-center border-r border-slate-200 pr-4">
            <p className="text-2xl text-slate-400 font-black uppercase">SGST</p>
            <p className="text-3xl text-orange-600 font-black">
              ₹{row.sgst || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl text-slate-400 font-black uppercase">IGST</p>
            <p className="text-3xl text-yellow-600 font-black">
              ₹{row.igst || 0}
            </p>
          </div>
        </div>
      ),
    },
    {
      name: "Total Amount",
      right: true,
      cell: (row) => (
        <div className="bg-green-600 px-5 py-2 rounded-2xl shadow-lg shadow-indigo-100">
          <span className="text-white text-2xl font-black">
            ₹
            {parseFloat(row.total || row.total_amount || 0).toLocaleString(
              "en-IN",
            )}
          </span>
        </div>
      ),
    },
  ];

  const exportCSV = () => {
  const data = allData[activeTab];

  if (!data || !data.length) {
    alert("No data available to export");
    return;
  }

  const headers = [
    "Invoice No",
    "Taxable Value",
    "CGST",
    "SGST",
    "IGST",
    "Total Amount",
  ];

  const rows = data.map((row) => [
    `\t${row.invoice_no || row.bill_no || ""}`,
    row.taxable_value || 0,
    row.cgst || 0,
    row.sgst || 0,
    row.igst || 0,
    row.total || row.total_amount || 0,
  ]);

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((e) => e.join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `GSTR1-${activeTab}.csv`;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const exportPDF = () => {
  const data = allData[activeTab];

  if (!data || !data.length) {
    alert("No data available to export");
    return;
  }

  const doc = new jsPDF();
  doc.text(`GSTR-1 ${activeTab.toUpperCase()} Report`, 14, 15);

  const rows = data.map((row) => [
    row.invoice_no || row.bill_no || "",
    row.taxable_value || 0,
    row.cgst || 0,
    row.sgst || 0,
    row.igst || 0,
    row.total || row.total_amount || 0,
  ]);

  autoTable(doc, {
    head: [
      [
        "Invoice",
        "Taxable",
        "CGST",
        "SGST",
        "IGST",
        "Total",
      ],
    ],
    body: rows,
    startY: 25,
  });

  doc.save(`GSTR1-${activeTab}.pdf`);
};

  return (
    <Layout>
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            GSTR-1 <span className="text-indigo-600">Summary</span>
          </h1>
          <ul className="breadcrumbs flex items-center flex-wrap justify-start gap-2 mt-2">
            <li className="text-slate-500 font-medium hover:text-indigo-600">
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <i className="icon-chevron-right text-xs text-slate-400"></i>
            </li>
            <li className="text-slate-500 font-medium">Reports</li>
            <li>
              <i className="icon-chevron-right text-xs text-slate-400"></i>
            </li>
            <li className="text-indigo-600 font-black">GSTR-1</li>
          </ul>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex space-x-2 mb-6 mt-6 bg-slate-200/50 p-2 rounded-[2rem] w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-10 py-4 rounded-[1.5rem] text-xl font-black transition-all duration-300 uppercase ${
                activeTab === t.id
                  ? "bg-white text-indigo-600 shadow-xl scale-105"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* MODERN FILTER BAR */}
        <div className="wg-box mb-8 shadow-xl rounded-3xl p-8 border border-slate-200 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Branch, Start Date, End Date Inputs same as before... */}
            <div className="flex flex-col">
              <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1">
                Branch
              </label>
              <select
                className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                value={filters.branch_id}
                onChange={(e) =>
                  setFilters({ ...filters, branch_id: e.target.value })
                }
              >
                <option value="">
                  {user_data?.user?.role?.toLowerCase() === "admin"
                    ? "All Branches"
                    : "Select Branch"}
                </option>
                {branchList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name || b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                value={filters.start_date}
                onChange={(e) =>
                  setFilters({ ...filters, start_date: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                value={filters.end_date}
                onChange={(e) =>
                  setFilters({ ...filters, end_date: e.target.value })
                }
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadReport}
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

        {/* TABLE CONTAINER */}
        <div className="relative wg-box shadow-2xl rounded-3xl overflow-hidden border border-slate-200 bg-white">
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md">
              <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="mt-6 text-3xl font-black text-indigo-600 animate-pulse">
                SYNCING DATA...
              </p>
            </div>
          )}

          <DataTable
            columns={columns}
            data={allData[activeTab]}
            pagination
            highlightOnHover
            customStyles={customTableStyles}
          />
        </div>
      </div>
    </Layout>
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

export default GSTR1Reports;
