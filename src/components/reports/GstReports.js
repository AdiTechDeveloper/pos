import React, { useEffect, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";

const GstReports = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const [salesData, setSalesData] = useState([]);
  const appData = useAppData();
  const branchList = appData?.branches || [];
  const [loading, setLoading] = useState(false);

  const exportPDF = () => {
    if (!salesData.length) {
      alert("No data available to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("GST Sales Report", 14, 15);

    const tableRows = salesData.map((row) => [
      row.bill_no,
      row.invoice_date,
      row.taxable_value,
      row.total_cgst,
      row.total_sgst,
      row.total_igst,
      row.total_amount,
    ]);

    autoTable(doc, {
      head: [
        ["Invoice", "Date", "Taxable", "CGST", "SGST", "IGST", "Net Amount"],
      ],
      body: tableRows,
      startY: 25,
    });

    doc.save("GST-Sales-Report.pdf");
  };

  const exportCSV = () => {
    if (!salesData.length) {
      alert("No data available to export");
      return;
    }

    const headers = [
      "Invoice",
      "Date",
      "Taxable",
      "CGST",
      "SGST",
      "IGST",
      "Net Amount",
    ];

    const rows = salesData.map((row) => [
      `\t${row.bill_no}`,
      row.invoice_date,
      row.taxable_value,
      row.total_cgst,
      row.total_sgst,
      row.total_igst,
      row.total_amount,
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
    link.download = "GST-Sales-Report.csv";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

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

  // Fetch Branches
  const fetchBranches = () => {
    appData?.loadBranches();
  };

  // Fetch GST Report
  const fetchGstReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/api/reports/gst/sales-GST`,
        filters,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );
      setSalesData(response.data.data || []);
    } catch (error) {
      console.error("Error fetching GST report:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, BASE_URL, user_data.token]);

  useEffect(() => {
    fetchGstReport();
    fetchBranches();
  }, [fetchGstReport]);

  const columns = [
    {
      name: "Invoice",
      selector: (row) => row.bill_no,
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col py-2">
          <span className="text-2xl font-black text-slate-800">
            {row.bill_no}
          </span>
          <span className="text-xl mt-2 text-slate-400 font-bold uppercase">
            {row.invoice_date}
          </span>
        </div>
      ),
    },
    {
      name: "Taxable",
      cell: (row) => (
        <span className="text-3xl font-bold text-slate-600">
          ₹{parseFloat(row.taxable_value).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      name: "GST Breakdown",
      grow: 2,
      center: true,
      cell: (row) => (
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full justify-around">
          <div className="text-center">
            <p className="text-2xl text-slate-400 font-bold uppercase">CGST</p>
            <p className="text-3xl text-blue-600 font-black">
              ₹{row.total_cgst}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl text-slate-400 font-bold uppercase">SGST</p>
            <p className="text-3xl text-orange-600 font-black">
              ₹{row.total_sgst}
            </p>
          </div>
          {parseFloat(row.total_igst) > 0 && (
            <div className="text-center">
              <p className="text-2xl text-slate-400 font-bold uppercase">
                IGST
              </p>
              <p className="text-3xl text-purple-600 font-black">
                ₹{row.total_igst}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Net Amount",
      right: true,
      cell: (row) => (
        <div className="bg-yellow-600 px-5 py-2 rounded-2xl">
          <span className="text-white text-2xl font-black">
            ₹{parseFloat(row.total_amount).toLocaleString("en-IN")}
          </span>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              GST Output{" "}
              <span className="text-indigo-600">GST Sales Report</span>
            </h1>
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
                <div className="text-tiny">GST Output Sales</div>
              </li>
            </ul>
          </div>

          <div className="wg-box mb-6 shadow-lg rounded-3xl p-8 border border-slate-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              {/* Branch Selection */}
              <div className="flex flex-col">
                <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wide">
                  Branch
                </label>
                <select
                  className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                  name="branch_id"
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

                  {branchList && branchList.length > 0 ? (
                    branchList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.name}
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      No branch available
                    </option>
                  )}
                </select>
              </div>

              {/* Start Date */}
              <div className="flex flex-col">
                <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wide">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                />
              </div>

              {/* End Date */}
              <div className="flex flex-col">
                <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wide">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                />
              </div>

              {/* Refresh Button */}
              <div className="flex items-end">
                <button
                  onClick={fetchGstReport}
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

          <div className="wg-box shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
            <DataTable
              columns={columns}
              data={salesData}
              pagination
              highlightOnHover
              progressPending={loading}
              customStyles={customTableStyles}
            />
          </div>
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

export default GstReports;
