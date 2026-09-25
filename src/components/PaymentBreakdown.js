import React from "react";
import DonutChart from "./DonutChart";

const rupee = (v) => `₹${Number(v || 0).toFixed(2)}`;

const PALETTE = [
  "#23C55E",
  "#2377FC",
  "#8B5CF6",
  "#F59E0B",
  "#FC2359",
  "#06B6D4",
];

const PaymentBreakdown = ({ report, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-64 w-full bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  const rows = report?.payment_methods?.rows || [];
  const grandTotal =
    report?.payment_methods?.grand_total ??
    rows.reduce((s, r) => s + (Number(r.total_collected) || 0), 0);
  const due = report?.kpis?.total_due ?? 0;

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="text-3xl font-bold text-gray-800 mb-2">
          Today's Collection
        </h3>
        <p className="text-xl text-gray-400">No bills created today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">Today's Collection</h3>
        <span className="text-2xl text-gray-400">
          Collected:{" "}
          <span className="text-2xl text-gray-700">
            {rupee(grandTotal)}
          </span>
        </span>
      </div>

      <DonutChart
        centerLabel="Collected"
        formatValue={rupee}
        size={220}
        thickness={28}
        centered
        data={rows.map((r, i) => ({
          label: r.method,
          value: Number(r.total_collected) || 0,
          color: PALETTE[i % PALETTE.length],
        }))}
      />

      {due > 0 && (
        <div className="mt-6 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
          <span className="text-xl font-medium text-amber-700">
            Pending (not yet collected)
          </span>
          <span className="text-xl font-bold text-amber-700">
            {rupee(due)}
          </span>
        </div>
      )}
    </div>
  );
};

export default PaymentBreakdown;