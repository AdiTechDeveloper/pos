import { useState, useEffect } from "react";
import { useProfitLoss } from "../hooks/useProfitLoss";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;

  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : {};
};

const ProfitLossReport = ({ role, user }) => {
  const today = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
  });

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

  return (
    <div
      className="bg-gray-50 rounded-3xl shadow-2xl p-6 max-w-7xl mw-auto"
      style={{ width: "100%" }}
    >
      {/* Header & Filters */}
      <h2 className="text-4xl font-extrabold text-gray-800 mb-8">
        Profit & Loss Dashboard
      </h2>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            name="from_date"
            value={filters.from_date}
            onChange={handleChange}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          <input
            type="date"
            name="to_date"
            value={filters.to_date}
            onChange={handleChange}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <div className="flex gap-2 mb-4">
            {["daily", "monthly", "yearly"].map((type) => (
              <button
                key={type}
                onClick={() => handleViewType(type)}
                className="px-10 py-6 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-3xl mt-4 mb-4"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {role === "admin" && (
            <select
              name="branch_id"
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
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
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sales Card */}
          <div className="bg-white rounded-2xl p-5 shadow hover:shadow-xl transition flex flex-col items-center mb-10">
            <p className="text-gray-400 text-2xl">Sales</p>
            <h4 className="text-4xl font-bold text-indigo-600 mb-2">
              ₹ {data.sales}
            </h4>
          </div>

          {/* COGS Card */}
          <div className="bg-white rounded-2xl p-5 shadow hover:shadow-xl transition flex flex-col items-center mb-10">
            <p className="text-gray-400 text-2xl">COGS</p>
            <h4 className="text-4xl font-bold text-yellow-600 mb-2">
              ₹ {data.cogs}
            </h4>
          </div>

          {/* Profit Card */}
          <div
            className={`rounded-2xl p-5 shadow hover:shadow-xl transition flex flex-col items-center mb-10 ${
              data.status === "profit" ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <p className="text-gray-400 text-2xl">Profit</p>
            <h4
              className={`text-4xl font-bold mb-2 ${
                data.status === "profit" ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹ {data.profit}
            </h4>
          </div>

          {/* Status Card */}
          <div
            className={`rounded-2xl p-3 shadow hover:shadow-xl transition flex flex-col items-center mb-10 ${
              data.status === "profit" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <p className="text-gray-400 text-2xl">Status</p>

            <span
              className={`text-5xl font-bold ${
                data.status === "profit" ? "text-green-600" : "text-red-600"
              }`}
            >
              {data.status === "profit" ? "▲" : "▼"}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">No data available</p>
      )}
    </div>
  );
};

export default ProfitLossReport;
