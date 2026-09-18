import { useState, useEffect } from "react";
import { topSellingProducts } from "../utils/reportService";
import DataTable from "react-data-table-component";
import { useAppData } from "../context/AppDataContext";

const TopSellingProducts = ({ role, user = {}, filters = {} }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const appData = useAppData();
  const branches = appData?.branches || [];
  const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || "");

  // Fetch branches if admin — shared cache
  useEffect(() => {
    if (role === "admin") {
      appData?.loadBranches();
    }
  }, [role]);

  // Fetch top-selling products
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = {};

      if (role === "admin" && selectedBranch && selectedBranch !== "ALL") {
        params.branch_id = selectedBranch;
      }

      try {
        const data = await topSellingProducts(params);
        setProducts(Array.isArray(data?.data) ? data.data : data || []);
      } catch (err) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, selectedBranch]);

  const columns = [
    {
      name: "#",
      selector: (row, index) => index + 1,
      width: "80px",
      center: true,
    },
    {
      name: "Product",
      cell: (row) => (
        <div>
          <div className="font-semibold text-2xl mb-6 mt-6">
            {row.product?.name}
          </div>
          <div className="text-gray-400 text-2xl mb-6">
            SKU: {row.product?.sku}
          </div>
        </div>
      ),
      grow: 2,
    },
    {
      name: "Qty Sold",
      selector: (row) => row.total_qty,
      right: true,
      sortable: true,
    },
    {
      name: "Total Sales",
      selector: (row) => `₹ ${row.total_sales}`,
      right: true,
      sortable: true,
      cell: (row) => (
        <span className="text-indigo-600 font-semibold text-2xl">
          ₹ {row.total_sales}
        </span>
      ),
    },
    {
      name: "Profit",
      selector: (row) => `₹ ${row.total_profit}`,
      right: true,
      sortable: true,
      cell: (row) => (
        <span className="text-green-600 font-semibold text-2xl">
          ₹ {row.total_profit}
        </span>
      ),
    },
  ];

  const handleChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-4xl font-bold mb-10">Top Selling Products</h3>

      {role === "admin" && (
        <select
          name="branch_id"
          value={selectedBranch}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none mb-6"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : products.length ? (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={products}
            pagination
            paginationPerPage={5}
            paginationRowsPerPageOptions={[5, 10, 20]}
            highlightOnHover
            responsive
            striped
            noDataComponent="No data available"
          />
        </div>
      ) : (
        <p className="text-gray-500 text-center text-2xl">No data available</p>
      )}
    </div>
  );
};

export default TopSellingProducts;
