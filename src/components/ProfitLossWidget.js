import { useState, useEffect } from "react";
import { useProfitLoss } from "../hooks/useProfitLoss";
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
import { TrendingUp, TrendingDown } from "lucide-react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;

  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : {};
};

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const BAR_COLORS = {
  Sales: "#2377FC",
  COGS: "#F59E0B",
  Profit: "#23C55E",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 text-sm">
      <div className="font-semibold text-gray-800 mb-1">{label}</div>
      <div className="font-bold" style={{ color: payload[0].payload.fill }}>
        {rupee(payload[0].value)}
      </div>
    </div>
  );
};

const ProfitLossReport = ({ role, user }) => {
  const today = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
  });
  const [activeView, setActiveView] = useState("daily");

  const [branches, setBranches] = useState([]);
  const { data, loading } = useProfitLoss(filters);

  useEffect(() => {
    if (role === "admin") {
      axios
        .get(`${BASE_URL}/api/branches`, {
          headers: getAuthHeader(),
        })
        .then((res) => {
          setBranches(res.data.data ?? []);
        })
        .catch((err) => {
          console.error("Error fetching branches:", err);
          setBranches([]);
        });
    }
  }, [role]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "branch_id" && value === "") {
      const copy = { ...filters };
      delete copy.branch_id;
      setFilters(copy);
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };

  const handleViewType = (type) => {
    setActiveView(type);
    const today = new Date();

    const formatYMD = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    let from_date, to_date;

    switch (type) {
      case "daily":
        from_date = to_date = formatYMD(today);
        break;

      case "monthly":
        from_date = formatYMD(
          new Date(today.getFullYear(), today.getMonth(), 1),
        );
        to_date = formatYMD(today);
        break;

      case "yearly":
        from_date = formatYMD(new Date(today.getFullYear(), 0, 1));
        to_date = formatYMD(today);
        break;

      default:
        from_date = to_date = formatYMD(today);
    }

    setFilters((prev) => ({ ...prev, from_date, to_date }));
  };

  const chartData = data
    ? [
        { name: "Sales", value: Number(data.sales) || 0, fill: BAR_COLORS.Sales },
        { name: "COGS", value: Number(data.cogs) || 0, fill: BAR_COLORS.COGS },
        { name: "Profit", value: Number(data.profit) || 0, fill: BAR_COLORS.Profit },
      ]
    : [];

  const isProfit = data?.status === "profit";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">
          Profit &amp; Loss
        </h2>
        {data && !loading && (
          <span
            className={`flex items-center gap-1.5 text-xl font-semibold px-3 py-1 rounded-full border ${
              isProfit
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {isProfit ? <TrendingUp size={18} /> : <TrendingDown size={13} />}
            {isProfit ? "Profit" : "Loss"}
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xl font-semibold text-gray-500 mb-2">From</label>
            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 mb-5  text-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xl font-semibold text-gray-500 mb-2">To</label>
            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 mb-5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {role === "admin" && (
            <div className="flex flex-col">
              <label className="text-xl font-semibold text-gray-500 mb-1">Branch</label>
              <select
                name="branch_id"
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {["daily", "monthly", "yearly"].map((type) => (
            <button
              key={type}
              onClick={() => handleViewType(type)}
              className={`px-4 py-2 rounded-lg text-xl font-semibold transition-colors ${
                activeView === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      ) : data ? (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F6" />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xl text-gray-400">Sales</p>
              <p className="text-lg font-bold text-blue-600">{rupee(data.sales)}</p>
            </div>
            <div className="text-center">
              <p className="text-xl text-gray-400">COGS</p>
              <p className="text-lg font-bold text-amber-600">{rupee(data.cogs)}</p>
            </div>
            <div className="text-center">
              <p className="text-xl text-gray-400">Profit</p>
              <p
                className={`text-lg font-bold ${
                  isProfit ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {rupee(data.profit)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500 py-10">No data available</p>
      )}
    </div>
  );
};

export default ProfitLossReport;