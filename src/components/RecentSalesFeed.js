import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ReceiptIndianRupee } from "lucide-react";
import { useAppData } from "../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const getCustomerName = (row) =>
  row?.customer?.name || row?.customer_name || row?.customerName || "Walk-in Customer";

const STATUS_STYLES = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-rose-50 text-rose-700 border-rose-200",
};

const RecentSalesFeed = ({ role, user, filters = {}, storeId }) => {
  const appData = useAppData();
  const branches = appData?.branches || [];
  const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || "");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch branches list (admin only — needed to populate the dropdown)
  useEffect(() => {
    if (role === "admin") {
      appData?.loadBranches();
    }
  }, [role]);

  // Fetch recent invoices, scoped to whichever branch is selected
  useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);

      const params = {
        date_range: "this_month",
        bill_status: "all",
      };

      if (role === "admin" && selectedBranch && selectedBranch !== "ALL") {
        params.branch_id = selectedBranch;
      } else if (
        role === "manager" &&
        filters.branch_id &&
        filters.branch_id !== "ALL"
      ) {
        params.branch_id = filters.branch_id;
      }
      if (storeId) {
        params.store_id = storeId;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/reports/sales-report`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          params,
        });
        setBills(res.data?.invoices?.rows || []);
      } catch (err) {
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [role, selectedBranch, filters.branch_id, storeId, user?.token]);

  const handleChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const recent = [...(bills || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ReceiptIndianRupee size={20} className="text-blue-600" />
          Recent Sales
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
            to="/sale-bills"
            className="text-xl font-semibold text-blue-600 hover:text-blue-700"
          >
            View All
          </Link>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="text-xl text-gray-400 py-6 text-center">
          No sales recorded yet.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
     
          {recent.map((row) => (
            <div key={row.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="text-xl font-medium text-gray-800 truncate">
                  {getCustomerName(row)}
                </div>
                <div className="text-xl text-gray-400">
                  
                  #{row.bill_no} ·{" "}
                      {console.log(row.created_at)}
                    {new Date(row.created_at).toLocaleString("en-IN")
                    }
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-xl font-bold text-gray-800">
                  {rupee(row.total_amount)}
                </span>
                <span
                  className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${
                    STATUS_STYLES[row.payment_status] ||
                    " bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {row.payment_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentSalesFeed;