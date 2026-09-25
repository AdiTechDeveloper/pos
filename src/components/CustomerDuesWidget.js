import React from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const getCustomerName = (row) =>
  row?.customer?.name || row?.customer_name || "Unknown Customer";

const getCustomerMobile = (row) =>
  row?.customer?.mobile || row?.customer_mobile || "-";

const CustomerDuesWidget = ({ dues, loading }) => {
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
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Users size={24} className="text-amber-600" />
          Customer Dues
        </h3>
        <Link
          to="/customer-dues"
          className="text-2xl font-semibold text-blue-600 hover:text-blue-700"
        >
          View All
        </Link>
      </div>
      <p className="text-xl text-gray-400 mb-4">
        Total outstanding: <span className="font-semibold text-amber-700">{rupee(totalDue)}</span>
      </p>

      {top5.length === 0 ? (
        <p className="text-xl text-gray-400 py-6 text-center">
          No pending dues right now.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {top5.map((row, i) => (
            <div key={row.customer_id || i} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <div className="text-xl font-medium text-gray-800 truncate">
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