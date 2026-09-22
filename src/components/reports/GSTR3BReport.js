import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Layout from "../layout";
import { Link } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";
import { RefreshCw, FileSpreadsheet, FileDown } from "lucide-react";


const BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function GSTR3BReport() {
  const appData = useAppData();
  const user_detail_raw = JSON.parse(localStorage.getItem("user_detail"));
  const user_data = user_detail_raw;
  const token = user_detail_raw?.token;

  const [filters, setFilters] = useState({
    branch_id: "",
    start_date: (() => {
      const d = new Date();
      d.setDate(1);
      return d.toLocaleDateString("en-CA");
    })(),
    end_date: new Date().toLocaleDateString("en-CA"),
  });

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branchList, setBranchList] = useState([]);

  useEffect(() => {
    appData?.loadBranches();
  }, []);

  useEffect(() => {
    setBranchList(appData?.branches || []);
  }, [appData?.branches]);

  const handleFetch = useCallback(async () => {
    if (!filters.start_date || !filters.end_date) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/reports/gst/gstr3b-Summary`,
        filters,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSummary(res.data.gstr3b);
    } catch (err) {
      console.error("GSTR3B API Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    handleFetch();
  }, [handleFetch]);

  const SummaryTable = ({ title, data, colorClass }) => (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <h2
        className={`text-3xl font-black uppercase tracking-wider mb-4 ${colorClass}`}
      >
        {title}
      </h2>
      <div className="grid gap-4 mt-6">
        {Object.entries(data).map(([key, value]) => {
          const numValue = parseFloat(value || 0);
          const isNegative = numValue < 0;

          return (
            <div
              key={key}
              className="group relative flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 overflow-hidden"
            >
              <div
                className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${isNegative ? "bg-rose-500" : "bg-emerald-500"}`}
              ></div>

              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-400 uppercase tracking-[0.15em] mb-1">
                  {key.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-2">
                  {/* Status Dot */}
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${isNegative ? "bg-rose-500" : "bg-emerald-500"}`}
                  ></div>
                  <span className="text-xl font-bold text-slate-500">
                    Breakdown Entry
                  </span>
                </div>
              </div>

              <div className="text-right z-10">
                <div
                  className={`inline-flex items-center px-4 py-2 rounded-2xl font-black text-3xl transition-all duration-300 ${isNegative
                      ? "text-rose-600 bg-rose-50 shadow-[inset_0_0_10px_rgba(225,29,72,0.05)]"
                      : "text-emerald-600 bg-emerald-50/50"
                    }`}
                >
                  {isNegative ? (
                    <span className="mr-2 text-xl">▼</span>
                  ) : (
                    <span className="mr-2 text-xl">▲</span>
                  )}
                  <span className="text-xl mr-1 font-bold">₹</span>
                  {Math.abs(numValue).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>

                <p
                  className={`text-[10px] font-bold uppercase mt-1 pr-2 tracking-widest ${isNegative ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {isNegative ? "Liability / Reversal" : "Available / Taxable"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* TOP HEADER & BREADCRUMBS */}
          <div className="flex justify-between items-center mb-8">
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
                    GSTR3B Summary
                  </h3>

                </div>
              </div>

            </div>
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
              <li className="text-indigo-600 font-black">GSTR-3B</li>
            </ul>
          </div>

          {/* MODERN FILTERS PANEL */}
          <div className="wg-box mb-10 shadow-xl rounded-3xl p-8 border border-slate-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Branch Filter */}
              <div className="flex flex-col">
                <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1">
                  Branch
                </label>
                <select
                  className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer"
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

              {/* Start Date */}
              <div className="flex flex-col">
                <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                />
              </div>

              {/* End Date */}
              <div className="flex flex-col">
                <label className="text-xl font-bold text-slate-500 uppercase mb-2 ml-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full h-[55px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleFetch}
                  title={loading ? "Loading..." : "Refresh"}
                  className="flex items-center justify-center bg-green-600 text-white h-[45px] w-[45px] rounded-xl shadow-md hover:bg-green-700 transition-colors shrink-0 mb-[2px]"
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={22} />
                </button>
              </div>
            </div>
          </div>

          {/* RESULTS AREA WITH LOADING STATE */}
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 bg-slate-50/50 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl min-h-[400px]">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-4xl font-black text-indigo-600 uppercase tracking-widest animate-pulse">
                  Fetching Report...
                </p>
              </div>
            )}

            {summary ? (
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-300 ${loading ? "opacity-20" : "opacity-100"}`}
              >
                <SummaryTable
                  title="Outward Supplies (Sales)"
                  data={summary.outward_supplies}
                  colorClass="text-blue-600"
                />
                <SummaryTable
                  title="Inward Supplies (ITC)"
                  data={summary.inward_supplies}
                  colorClass="text-orange-600"
                />
                <SummaryTable
                  title="Net Tax Payable"
                  data={summary.net_tax_payable}
                  colorClass="text-red-600"
                />
                <SummaryTable
                  title="ITC Status"
                  data={summary.itc_summary}
                  colorClass="text-yellow-600"
                />
              </div>
            ) : (
              !loading && (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-3xl font-bold text-slate-400">
                    No data found for the selected period
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
