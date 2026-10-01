import React, { useEffect, useState } from "react";
import axios from "axios";
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

const cacheKey = (year, monthIdx, branchId) =>
  `monthlySales:${year}-${monthIdx}:${branchId || "all"}`;

const MonthlySalesChart = ({ user, branchId }) => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [data, setData] = useState(
    MONTH_LABELS.map((m) => ({ month: m, sales: 0 })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const currentMonthIdx = now.getMonth(); // 0-based, e.g. Sep = 8
      const token = user?.token;

      const results = await Promise.all(
        MONTH_LABELS.map(async (_, i) => {
          // Never fetch future months - they're just 0
          if (i > currentMonthIdx) return 0;

          const key = cacheKey(year, i, branchId);
          const isCompletedMonth = i < currentMonthIdx;

          if (isCompletedMonth) {
            const cached = sessionStorage.getItem(key);
            if (cached !== null) return Number(cached);
          }

          const from = `${year}-${String(i + 1).padStart(2, "0")}-01`;
          const lastDay = new Date(year, i + 1, 0).getDate();
          const to = `${year}-${String(i + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

          try {
            const res = await axios.get(`${BASE_URL}/api/reports/sales-report`, {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
              params: {
                date_range: "custom",
                date_from: from,
                date_to: to,
                bill_status: "all",
                branch_id: branchId || null,
              },
            });
            const value = Number(res.data?.kpis?.gross_sales) || 0;

            // Only cache completed months - current month keeps changing all day
            if (isCompletedMonth) {
              sessionStorage.setItem(key, String(value));
            }
            return value;
          } catch {
            return 0;
          }
        }),
      );

      setData(MONTH_LABELS.map((m, i) => ({ month: m, sales: results[i] })));
      setLoading(false);
    };

    if (user?.token) load();
  }, [user, branchId, BASE_URL]);

  const maxSales = Math.max(...data.map((d) => d.sales), 0);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-80 animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Monthly Sales ({new Date().getFullYear()})
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
          <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.sales === maxSales && maxSales > 0 ? "#2377FC" : "#BFDBFE"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlySalesChart;