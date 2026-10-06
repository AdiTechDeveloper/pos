import React, { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import { Building2, TrendingUp } from "lucide-react";
import Layout from "../layout";
import { useAppData } from "../../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 text-sm">
      <div className="font-semibold text-gray-800">{label}</div>
      <div className="text-blue-600 font-bold">{rupee(payload[0].value)}</div>
    </div>
  );
};

export default function SupplierTracking() {
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const role = user_data?.user?.role;
  const adminStoreId = role === "admin" ? user_data?.user?.store_id ?? null : null;
  const managerBranchId =
    role === "manager"
      ? user_data?.branch_id ??
        user_data?.user?.branch_id ??
        user_data?.user?.branch_ids?.[0] ??
        null
      : null;

  const appData = useAppData();
  const branches = appData?.branches || [];
  const [selectedBranch, setSelectedBranch] = useState("");

  const [ranking, setRanking] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  const [selectedSupplier, setSelectedSupplier] = useState(null); // { id, name }
  const [year, setYear] = useState(new Date().getFullYear());
  const [bills, setBills] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const effectiveBranchId =
    role === "admin" && selectedBranch && selectedBranch !== "ALL"
      ? selectedBranch
      : role === "manager"
        ? managerBranchId
        : null;

  useEffect(() => {
    if (role === "admin") appData?.loadBranches();
  }, [role]);

  // Lifetime ranking — which supplier we've bought the most from overall
  useEffect(() => {
    const fetchRanking = async () => {
      setRankingLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/reports/purchase-report`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data?.token}`,
          },
          params: {
            date_range: "custom",
            date_from: "2015-01-01", // stand-in for "all time" - see note above
            date_to: new Date().toISOString().slice(0, 10),
            branch_id: effectiveBranchId,
            store_id: adminStoreId,
          },
        });
        const rows = res.data?.supplier_breakdown?.rows || [];
        setRanking([...rows].sort((a, b) => b.total_amount - a.total_amount));
      } catch {
        setRanking([]);
      } finally {
        setRankingLoading(false);
      }
    };
    fetchRanking();
  }, [effectiveBranchId, adminStoreId]);

  // Selected supplier's bills for the chosen year - one call, grouped client-side
   useEffect(() => {
    const fetchRanking = async () => {
      setRankingLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/reports/supplier-tracking`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data?.token}`,
          },
          params: {
            branch_id: effectiveBranchId,
            store_id: adminStoreId,
          },
        });
        setRanking(res.data?.suppliers || []);
      } catch {
        setRanking([]);
      } finally {
        setRankingLoading(false);
      }
    };
    fetchRanking();
  }, [effectiveBranchId, adminStoreId]);

  useEffect(() => {
    if (!selectedSupplier) return;

    const fetchSupplierYear = async () => {
      setDetailLoading(true);
      try {
        const res = await axios.get(
          `${BASE_URL}/api/reports/supplier-tracking/${selectedSupplier.id}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${user_data?.token}`,
            },
            params: {
              year,
              branch_id: effectiveBranchId,
              store_id: adminStoreId,
            },
          },
        );
        setBills(res.data?.bills || []);
      } catch {
        setBills([]);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchSupplierYear();
  }, [selectedSupplier, year, effectiveBranchId, adminStoreId]);

  const yearlyTotal = bills.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);

  const monthlyData = MONTH_LABELS.map((label, i) => {
    const total = bills
      .filter((b) => new Date(b.bill_date).getMonth() === i)
      .reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
    return { month: label, total };
  });
  const maxMonth = Math.max(...monthlyData.map((d) => d.total), 0);

  const billColumns = [
    {
      name: "Date",
      selector: (row) => row.bill_date,
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-700">{row.bill_date}</span>,
    },
    {
      name: "Bill No",
      selector: (row) => row.bill_no,
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-semibold text-gray-800">{row.bill_no}</span>
      ),
    },
    {
      name: "Taxable",
      selector: (row) => row.taxable_value,
      sortable: true,
      right: true,
      cell: (row) => <span className="text-sm text-gray-700">{rupee(row.taxable_value)}</span>,
    },
    {
      name: "Tax",
      selector: (row) => row.total_tax,
      sortable: true,
      right: true,
      cell: (row) => <span className="text-sm text-gray-700">{rupee(row.total_tax)}</span>,
    },
    {
      name: "Total",
      selector: (row) => row.total_amount,
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="text-sm font-semibold text-gray-900">{rupee(row.total_amount)}</span>
      ),
    },
    {
      name: "Status",
      center: true,
      cell: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            row.received
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {row.received ? "Received" : "Pending"}
        </span>
      ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "5px",
                  height: "34px",
                  borderRadius: "999px",
                  background: "linear-gradient(180deg, #2f63f6, #1f49dd)",
                }}
              />
              <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 }}>
                Supplier Tracking
              </h3>
            </div>

            {role === "admin" && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* LEFT: supplier ranking */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
                <Building2 size={18} className="text-blue-600" />
                Top Suppliers
              </h3>
              <p className="text-xs text-gray-400 mb-4">By total purchase amount</p>

              {rankingLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
                  ))}
                </div>
              ) : ranking.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No purchase data yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {ranking.map((s) => {
                    const isSelected = selectedSupplier?.id === s.supplier_id;
                    const maxAmt = ranking[0]?.total_amount || 1;
                    return (
                      <button
                        key={s.supplier_id}
                        onClick={() =>
                          setSelectedSupplier({ id: s.supplier_id, name: s.supplier_name })
                        }
                        className={`w-full text-left py-3 px-2 rounded-lg transition-colors ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {s.supplier_name}
                          </span>
                          <span className="text-sm font-bold text-gray-800 shrink-0 ml-2">
                            {rupee(s.total_amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${(s.total_amount / maxAmt) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {s.bill_count} bills · {s.share_pct}% of total
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: selected supplier detail */}
            <div className="flex flex-col gap-6">
              {!selectedSupplier ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
                  Select a supplier on the left to see their monthly totals and bills.
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {selectedSupplier.name}
                        </h3>
                        <p className="text-xs text-gray-400">Monthly purchase total</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={year}
                          onChange={(e) => setYear(Number(e.target.value))}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        >
                          {Array.from({ length: 5 }).map((_, i) => {
                            const y = new Date().getFullYear() - i;
                            return (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            );
                          })}
                        </select>
                        <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <TrendingUp size={14} />
                          {year} Total: {rupee(yearlyTotal)}
                        </span>
                      </div>
                    </div>

                    {detailLoading ? (
                      <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F6" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: "#6B7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#6B7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                            {monthlyData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.total === maxMonth && maxMonth > 0 ? "#2377FC" : "#BFDBFE"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      All Bills — {year}
                    </h3>
                    <DataTable
                      columns={billColumns}
                      data={bills}
                      pagination
                      highlightOnHover
                      responsive
                      progressPending={detailLoading}
                      noDataComponent={
                        <p className="text-sm text-gray-400 py-8">
                          No bills from this supplier in {year}.
                        </p>
                      }
                      customStyles={{
                        headCells: {
                          style: {
                            fontWeight: 600,
                            fontSize: "12px",
                            textTransform: "uppercase",
                            color: "#6B7280",
                            backgroundColor: "#F9FAFB",
                          },
                        },
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}