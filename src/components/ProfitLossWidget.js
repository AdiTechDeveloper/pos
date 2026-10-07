import { useState, useEffect } from "react";
import { useProfitLoss } from "../hooks/useProfitLoss";
import { useAppData } from "../context/AppDataContext";
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
import {
  TrendingUp,
  TrendingDown,
  ChartNoAxesCombined,
} from "lucide-react";

const rupee = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN")}`;

const BAR_COLORS = {
  Sales: "#2377FC",
  COGS: "#F59E0B",
  Profit: "#23C55E",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 text-sm">
      <div className="font-semibold text-gray-800 mb-1">
        {label}
      </div>

      <div
        className="font-bold"
        style={{ color: payload[0].payload.fill }}
      >
        {rupee(payload[0].value)}
      </div>
    </div>
  );
};

const ProfitLossWidget = ({ role, user }) => {
  const appData = useAppData();

  /*
   * Get branches from the same AppDataContext
   */
  const branches = appData?.branches || [];

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  /*
   * Find the branch assigned to the logged-in user/admin.
   */
  const getAdminBranchId = () => {
    // If role is strictly restricted and you want admins locked to their branch:
    // if (role !== "admin") return ""; // Adjust based on your permission rules

    return (
      user?.branch_id ||
      user?.branchId ||
      user?.store_id ||
      user?.storeId ||
      ""
    );
  };

  const adminBranchId = getAdminBranchId();

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
    // If you want standard admins locked to their branch by default, keep this. 
    // Otherwise, allow empty/all branches if they have multi-branch access.
    branch_id: role === "admin" && adminBranchId ? adminBranchId : "",
  });

  const [activeView, setActiveView] =
    useState("daily");

  /*
   * Load branches using the AppDataContext pattern
   */
  useEffect(() => {
    appData?.loadBranches?.();
  }, []);

  const { data, loading } =
    useProfitLoss(filters);

  /*
   * Handle input/dropdown change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
   * Daily / Monthly / Yearly
   */
  const handleViewType = (type) => {
    setActiveView(type);

    const todayDate = new Date();

    const formatYMD = (date) => {
      const y = date.getFullYear();

      const m = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const d = String(
        date.getDate()
      ).padStart(2, "0");

      return `${y}-${m}-${d}`;
    };

    let from_date;
    let to_date;

    switch (type) {
      case "daily":
        from_date = to_date =
          formatYMD(todayDate);
        break;

      case "monthly":
        from_date = formatYMD(
          new Date(
            todayDate.getFullYear(),
            todayDate.getMonth(),
            1
          )
        );

        to_date =
          formatYMD(todayDate);

        break;

      case "yearly":
        from_date = formatYMD(
          new Date(
            todayDate.getFullYear(),
            0,
            1
          )
        );

        to_date =
          formatYMD(todayDate);

        break;

      default:
        from_date = to_date =
          formatYMD(todayDate);
    }

    setFilters((prev) => ({
      ...prev,
      from_date,
      to_date,
    }));
  };

  const chartData = data
    ? [
        {
          name: "Sales",
          value: Number(data.sales) || 0,
          fill: BAR_COLORS.Sales,
        },
        {
          name: "COGS",
          value: Number(data.cogs) || 0,
          fill: BAR_COLORS.COGS,
        },
        {
          name: "Profit",
          value: Number(data.profit) || 0,
          fill: BAR_COLORS.Profit,
        },
      ]
    : [];

  const isProfit =
    data?.status === "profit";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">

        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ChartNoAxesCombined
            size={20}
            className="text-blue-600"
          />

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
            {isProfit ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={13} />
            )}

            {isProfit
              ? "Profit"
              : "Loss"}
          </span>
        )}

      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">

        <div className="flex flex-wrap items-end gap-3">

          {/* From */}
          <div className="flex flex-col">

            <label className="text-xl font-semibold text-gray-500 mb-2">
              From
            </label>

            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 mb-5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />

          </div>

          {/* To */}
          <div className="flex flex-col">

            <label className="text-xl font-semibold text-gray-500 mb-2">
              To
            </label>

            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 mb-5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />

          </div>

          {/* Branch / Store Dropdown */}
          <div className="flex flex-col">

            <label className="text-xl font-semibold text-gray-500 mb-1">
              Store
            </label>

            <select
              name="branch_id"
              value={filters.branch_id || ""}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 mb-5 text-xl bg-white text-gray-700 min-w-[180px] focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

          </div>

        </div>

        {/* View buttons */}
        <div className="flex gap-2 shrink-0">

          {[
            "daily",
            "monthly",
            "yearly",
          ].map((type) => (

            <button
              key={type}
              onClick={() =>
                handleViewType(type)
              }
              className={`px-4 py-2 rounded-lg text-xl font-semibold transition-colors ${
                activeView === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type
                .charAt(0)
                .toUpperCase() +
                type.slice(1)}
            </button>

          ))}

        </div>

      </div>

      {/* Chart */}
      {loading ? (

        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />

      ) : data ? (

        <>

          <ResponsiveContainer
            width="100%"
            height={260}
          >

            <BarChart
              data={chartData}
              margin={{
                top: 4,
                right: 8,
                left: 0,
                bottom: 0,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F1F3F6"
              />

              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 12,
                  fill: "#6B7280",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 12,
                  fill: "#6B7280",
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
                cursor={{
                  fill: "rgba(0,0,0,0.03)",
                }}
              />

              <Bar
                dataKey="value"
                radius={[
                  8,
                  8,
                  0,
                  0,
                ]}
              >

                {chartData.map(
                  (entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.fill}
                    />
                  )
                )}

              </Bar>

            </BarChart>

          </ResponsiveContainer>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">

            <div className="text-center">

              <p className="text-xl text-gray-400">
                Sales
              </p>

              <p className="text-lg font-bold text-blue-600">
                {rupee(data.sales)}
              </p>

            </div>

            <div className="text-center">

              <p className="text-xl text-gray-400">
                COGS
              </p>

              <p className="text-lg font-bold text-amber-600">
                {rupee(data.cogs)}
              </p>

            </div>

            <div className="text-center">

              <p className="text-xl text-gray-400">
                Profit
              </p>

              <p
                className={`text-lg font-bold ${
                  isProfit
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {rupee(data.profit)}
              </p>

            </div>

          </div>

        </>

      ) : (

        <p className="text-center text-gray-500 py-10">
          No data available
        </p>

      )}

    </div>
  );
};

export default ProfitLossWidget;