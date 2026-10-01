import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useAppData } from "../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const getCustomerName = (row) =>
  row?.customer?.name || row?.customer_name || "Unknown Customer";

const getCustomerMobile = (row) =>
  row?.customer?.mobile || row?.customer_mobile || "-";

const CustomerDuesWidget = ({ role, user, filters = {} }) => {
  const appData = useAppData();
  const branches = appData?.branches || [];
  const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || "");
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch branches list (admin only — needed to populate the dropdown)
  useEffect(() => {
    if (role === "admin") {
      appData?.loadBranches();
    }
  }, [role]);

  // Fetch dues, scoped to the selected branch when admin picks one
  useEffect(() => {
    const fetchDues = async () => {
      setLoading(true);

      const params = {};
      if (role === "admin" && selectedBranch && selectedBranch !== "ALL") {
        params.branch_id = selectedBranch;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/customer/due`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          params,
        });
        setDues(res.data?.data || []);
      } catch (error) {
        setDues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDues();
  }, [role, selectedBranch, user?.token]);

  const handleChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const rows = [...(dues || [])].sort(
    (a, b) => (Number(b.total_due) || 0) - (Number(a.total_due) || 0),
  );
  const top5 = rows.slice(0, 5);
  const totalDue = rows.reduce((s, r) => s + (Number(r.total_due) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-amber-600" />
          Customer Dues
        </h3>

        <div className="flex items-center gap-3">
          {role === "admin" && (
            <select
              name="branch_id"
              value={selectedBranch}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <Link
            to="/customer-dues"
            className="text-xl font-semibold text-blue-600 hover:text-blue-700"
          >
            View All
          </Link>
        </div>
      </div>
      <p className="text-xl text-gray-400 mb-4">
        Total outstanding:{" "}
        <span className="font-semibold text-amber-700">{rupee(totalDue)}</span>
      </p>

      {top5.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No pending dues right now.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {top5.map((row, i) => (
            <div key={row.customer_id || i} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="text-2xl font-medium text-gray-800 truncate">
                  {getCustomerName(row)}
                </div>
                <div className="text-xl text-gray-400">{getCustomerMobile(row)}</div>
              </div>
              <span className="text-xl font-bold text-amber-700 shrink-0 ml-3">
                {rupee(row.total_due)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerDuesWidget;