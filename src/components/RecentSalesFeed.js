import React from "react";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const getCustomerName = (row) =>
  row?.customer?.name || row?.customer_name || row?.customerName || "Walk-in Customer";

const STATUS_STYLES = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-rose-50 text-rose-700 border-rose-200",
};

const RecentSalesFeed = ({ bills, loading }) => {
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
          <Receipt size={20} className="text-blue-600" />
          Recent Sales
        </h3>
        <Link
          to="/sale-bill"
          className="text-2xl font-semibold text-blue-600 hover:text-blue-700"
        >
          View All
        </Link>
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
                  {new Date(row.created_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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