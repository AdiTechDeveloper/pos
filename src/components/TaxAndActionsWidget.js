import React from "react";
import { Link } from "react-router-dom";
import { Percent, Plus, ShoppingCart, PackagePlus, UserPlus } from "lucide-react";

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const TaxAndActionsWidget = ({ taxBreakdown, loading }) => {
  const t = taxBreakdown || {};

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Percent size={18} className="text-purple-600" />
        Today's Tax Breakdown
      </h3>
      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-3 text-center">
            <p className="text-xl text-purple-600 font-semibold">CGST</p>
            <p className="text-xl font-bold text-purple-700 mt-1">{rupee(t.cgst)}</p>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-3 text-center">
            <p className="text-xl text-violet-600 font-semibold">SGST</p>
            <p className="text-xl font-bold text-violet-700 mt-1">{rupee(t.sgst)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-3 text-center">
            <p className="text-xl text-indigo-600 font-semibold">IGST</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{rupee(t.igst)}</p>
          </div>
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-500 uppercase tracking-wide mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/pos"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xl hover:bg-blue-100 transition-colors"
        >
          <ShoppingCart size={16} /> New Sale
        </Link>
        <Link
          to="/purchase-bill"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 font-semibold text-xl hover:bg-amber-100 transition-colors"
        >
          <Plus size={16} /> New Purchase
        </Link>
        <Link
          to="/product"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-xl hover:bg-emerald-100 transition-colors"
        >
          <PackagePlus size={16} /> Add Product
        </Link>
        <Link
          to="/customer-dues"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 font-semibold text-xl hover:bg-rose-100 transition-colors"
        >
          <UserPlus size={16} /> Customer Dues
        </Link>
      </div>
    </div>
  );
};

export default TaxAndActionsWidget;