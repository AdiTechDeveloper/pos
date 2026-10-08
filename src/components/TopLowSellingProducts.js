
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArrowUpNarrowWide, ArrowDownNarrowWide } from "lucide-react";
import { useAppData } from "../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
      <div className="text-xl font-bold text-gray-800">
        {p.qty_sold} sold
      </div>

      <div className="text-xl text-gray-400">
        {rupee(p.net_revenue)}
      </div>
    </div>
  </div>
);

const TopLowSellingProducts = ({
  role,
  user,
  filters = {},
  storeId,
}) => {
  const {
    branches,
    loadBranches,
    dashboard,
  } = useAppData();

  const [selectedBranch, setSelectedBranch] = useState(
    filters.branch_id || ""
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load branches from AppDataContext cache
  useEffect(() => {
    if (role === "admin") {
      loadBranches();
    }
  }, [role, loadBranches]);

  // Use Dashboard cache for default view.
  // API is only called when a specific branch is selected.
  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      const isAllBranches =
        role === "admin" &&
        (!selectedBranch || selectedBranch === "ALL");

      const isManagerDashboard =
        role === "manager" &&
        (!filters.branch_id || filters.branch_id === "ALL");

      // Admin - All Branches
      if (isAllBranches && dashboard?.monthProducts) {
        if (mounted) {
          setProducts(dashboard.monthProducts);
          setLoading(false);
        }

        return;
      }

      // Manager - Default branch
      if (isManagerDashboard && dashboard?.monthProducts) {
        if (mounted) {
          setProducts(dashboard.monthProducts);
          setLoading(false);
        }

        return;
      }

      const params = {
        date_range: "this_month",
        bill_status: "all",
      };

      // Specific admin branch
      if (
        role === "admin" &&
        selectedBranch &&
        selectedBranch !== "ALL"
      ) {
        params.branch_id = selectedBranch;
      }

      // Specific manager branch
      else if (
        role === "manager" &&
        filters.branch_id &&
        filters.branch_id !== "ALL"
      ) {
        params.branch_id = filters.branch_id;
      }

      if (storeId) {
        params.store_id = storeId;
      }

      setLoading(true);

      try {
        const res = await axios.get(
          `${BASE_URL}/api/reports/sales-report`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${user?.token}`,
            },
            params,
          }
        );

        if (mounted) {
          setProducts(res.data?.products?.rows || []);
        }
      } catch (err) {
        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, [
    role,
    selectedBranch,
    filters.branch_id,
    storeId,
    user?.token,
    dashboard?.monthProducts,
  ]);

  const handleChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  const branchSelector =
    role === "admin" && (
      <select
        name="branch_id"
        value={selectedBranch}
        onChange={handleChange}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
        style={{ width: 200 }}
      >
        <option value="">All Branches</option>

        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-64 animate-pulse" />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-64 animate-pulse" />
      </div>
    );
  }

  const rows = (products || []).filter(
    (p) => Number(p.qty_sold) > 0
  );

  const sorted = [...rows].sort(
    (a, b) => Number(b.qty_sold) - Number(a.qty_sold)
  );

  const top5 = sorted.slice(0, 5);

  const low5 = sorted.slice(-5).reverse();

  const maxQty = Number(top5[0]?.qty_sold) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Selling Products */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpNarrowWide
              size={20}
              className="text-green-600"
            />

            Top Selling Products
          </h3>

          {branchSelector}
        </div>

        <p className="text-xl text-gray-400 mb-3">
          This month, by quantity sold
        </p>

        {top5.length === 0 ? (
          <p className="text-xl text-gray-400 py-6 text-center">
            No sales this month.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {top5.map((p, i) => (
              <ProductRow
                key={i}
                p={p}
                maxQty={maxQty}
                barColor="#23C55E"
              />
            ))}
          </div>
        )}
      </div>

      {/* Low Selling Products */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
            <ArrowDownNarrowWide
              size={20}
              className="text-red-600"
            />

            Low Selling Products
          </h3>

          {branchSelector}
        </div>

        <p className="text-xl text-gray-400 mb-3">
          This month, by quantity sold — consider a promotion
        </p>

        {low5.length === 0 ? (
          <p className="text-xl text-gray-400 py-6 text-center">
            No sales this month.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {low5.map((p, i) => (
              <ProductRow
                key={i}
                p={p}
                maxQty={maxQty}
                barColor="#FC2359"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopLowSellingProducts;