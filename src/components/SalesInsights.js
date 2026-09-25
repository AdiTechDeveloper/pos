import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const BAR_COLORS = {
  "Gross Sales": "#2377FC",
  "COGS": "#F59E0B",
  "Profit": "#23C55E",
  "Collected": "#14B8A6",
  "Due": "#FC2359",
};

const PIE_COLORS = ["#2377FC", "#23C55E", "#8B5CF6", "#F59E0B", "#FC2359", "#06B6D4"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 text-sm">
      <div className="font-semibold text-gray-800 mb-1">{label || payload[0].name}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-gray-600">
          {p.name}: <span className="font-bold" style={{ color: p.color || p.payload?.fill }}>
            {rupee(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const SalesInsights = ({ report, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-72 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-72 animate-pulse" />
      </div>
    );
  }

  const k = report?.kpis;
  if (!k) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Today's Sales Insights</h3>
        <p className="text-sm text-gray-400">No sales recorded yet today.</p>
      </div>
    );
  }

  const barData = [
    { name: "Gross Sales", value: Number(k.gross_sales) || 0 },
    { name: "COGS", value: Number(k.total_cogs) || 0 },
    { name: "Profit", value: Number(k.total_profit) || 0 },
    { name: "Collected", value: Number(k.total_collected) || 0 },
    // { name: "Due", value: Number(k.total_due) || 0 },
  ];

  const paymentRows = report?.payment_methods?.rows || [];
  const pieData = paymentRows.map((r) => ({
    name: r.method,
    value: Number(r.total_collected) || 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Bar chart: today's KPI comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Today's Sales Breakdown</h3>
          {k.profit_margin_pct !== undefined && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Margin {k.profit_margin_pct}%
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
            <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={BAR_COLORS[entry.name] || "#2377FC"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart: today's payment method split */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Payment Methods Today</h3>
          <span className="text-sm text-gray-400">
            Collected: <span className="font-semibold text-gray-700">{rupee(k.total_collected)}</span>
          </span>
        </div>
        {pieData.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No collections recorded yet today.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SalesInsights;