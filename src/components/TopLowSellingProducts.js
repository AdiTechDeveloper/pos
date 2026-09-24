import React from "react";

const rupee = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const ProductRow = ({ p, maxQty, barColor }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="flex-1 min-w-0">
      <div className="text-xl font-medium text-gray-800 truncate">
        {p.product_name}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${maxQty ? (p.qty_sold / maxQty) * 100 : 0}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
    <div className="text-right shrink-0">
      <div className="text-xl font-bold text-gray-800">{p.qty_sold} sold</div>
      <div className="text-xl text-gray-400">{rupee(p.net_revenue)}</div>
    </div>
  </div>
);

const TopLowSellingProducts = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-64 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-64 animate-pulse" />
      </div>
    );
  }

  const rows = (products || []).filter((p) => Number(p.qty_sold) > 0);
  const sorted = [...rows].sort((a, b) => b.qty_sold - a.qty_sold);
  const top5 = sorted.slice(0, 5);
  const low5 = sorted.slice(-5).reverse();
  const maxQty = top5[0]?.qty_sold || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-1">
          Top Selling Products
        </h3>
        <p className="text-xl text-gray-400 mb-3">This month, by quantity sold</p>
        {top5.length === 0 ? (
          <p className="text-xl text-gray-400 py-6 text-center">No sales this month.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {top5.map((p, i) => (
              <ProductRow key={i} p={p} maxQty={maxQty} barColor="#23C55E" />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-1">
          Low Selling Products
        </h3>
        <p className="text-xl text-gray-400 mb-3">
          This month, by quantity sold — consider a promotion
        </p>
        {low5.length === 0 ? (
          <p className="text-xl text-gray-400 py-6 text-center">No sales this month.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {low5.map((p, i) => (
              <ProductRow key={i} p={p} maxQty={maxQty} barColor="#FC2359" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopLowSellingProducts;