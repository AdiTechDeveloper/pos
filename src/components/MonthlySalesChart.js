


import React, {
  useEffect,
  useState,
} from "react";

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

import { useAppData } from "../context/AppDataContext";
import { CalendarDays } from "lucide-react";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const rupee = (value) =>
  `₹${Number(value || 0).toLocaleString(
    "en-IN"
  )}`;

const CustomTooltip = ({
  active,
  payload,
  label,
}) => {
  if (
    !active ||
    !payload ||
    !payload.length
  ) {
    return null;
  }
  return (
    
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 text-sm">
      <div className="font-semibold text-gray-800">
        {label}
      </div>

      <div className="text-blue-600 font-bold">
        {rupee(payload[0].value)}
      </div>
    </div>
  );
};

const MonthlySalesChart = ({
  role,
  user,
  filters = {},
  storeId,
}) => {
  console.log("MonthlySalesChart MOUNTED");

  const {
    branches,
    loadBranches,
    loadMonthlySales,
  } = useAppData();

  const [selectedBranch, setSelectedBranch] =
    useState(
      filters.branch_id || ""
    );

  const [data, setData] = useState(
    MONTH_LABELS.map((month) => ({
      month,
      sales: 0,
    }))
  );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (role !== "admin") {
      return;
    }

    loadBranches();
  }, [role, loadBranches]);

  useEffect(() => {
    if (role !== "admin") {
      return;
    }

    setSelectedBranch(
      filters.branch_id || ""
    );
  }, [role, filters.branch_id]);

  const managerBranchId =
    filters.branch_id ||
    user?.branch_id ||
    user?.user?.branch_id ||
    user?.user?.branch_ids?.[0] ||
    user?.branch_ids?.[0] ||
    null;

  const effectiveBranchId =
    role === "admin"
      ? selectedBranch || null
      : role === "manager"
      ? managerBranchId
      : null;

      
  useEffect(() => {
    
    let mounted = true;
  console.log("MONTHLY EFFECT START", {
    role,
    effectiveBranchId,
    storeId,
  });
    const loadData = async () => {
          console.log("MONTHLY loadData START");

      setLoading(true);

      try {
          console.log("CALLING loadMonthlySales");
        const monthlySales =
          await loadMonthlySales(
            effectiveBranchId,
            {
              storeId,
              year:
                new Date().getFullYear(),
            }
          );

      console.log("MONTHLY API RESPONSE", monthlySales);
        if (!mounted) {
          return;
        }

        setData(
          MONTH_LABELS.map(
            (month, index) => ({
              month,

              sales: Number(
                monthlySales?.[
                  index + 1
                ] || 0
              ),
            })
          )
        );
      } catch (error) {
        console.error(
          "Monthly sales load error:",
          error
        );

        if (!mounted) {
          return;
        }

        setData(
          MONTH_LABELS.map(
            (month) => ({
              month,
              sales: 0,
            })
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (
      role === "manager" &&
      !effectiveBranchId
    ) {
      setData(
        MONTH_LABELS.map(
          (month) => ({
            month,
            sales: 0,
          })
        )
      );

      setLoading(false);

      return () => {
        mounted = false;
      };
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [
    role,
    effectiveBranchId,
    storeId,
    loadMonthlySales,
  ]);

  const handleChange = (event) => {
    setSelectedBranch(
      event.target.value
    );
  };

  const maxSales = Math.max(
    ...data.map(
      (item) => item.sales
    ),
    0
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-80 animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarDays
            size={20}
            className="text-blue-600"
          />

          Monthly Sales (
          {new Date().getFullYear()}
          )
        </h3>

        {role === "admin" && (
          <select
            name="branch_id"
            value={selectedBranch}
            onChange={handleChange}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
            style={{
              width: 200,
            }}
          >
            <option value="">
              All Branches
            </option>

            {branches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              )
            )}
          </select>
        )}
      </div>

      <ResponsiveContainer
        width="100%"
        height={280}
      >
        <BarChart
          data={data}
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
            dataKey="month"
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
              fill:
                "rgba(0,0,0,0.03)",
            }}
          />

          <Bar
            dataKey="sales"
            radius={[
              6,
              6,
              0,
              0,
            ]}
          >
            {data.map(
              (entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.sales ===
                      maxSales &&
                    maxSales > 0
                      ? "#2377FC"
                      : "#BFDBFE"
                  }
                />
              )
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlySalesChart;