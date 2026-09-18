import { useState, useEffect } from "react";
import { fetchLowStockProducts } from "../utils/reportService";
import DataTable from "react-data-table-component";
import { useAppData } from "../context/AppDataContext";

const LowStockAlert = ({ role, user = {}, filters = {} }) => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const appData = useAppData();
  const branches = appData?.branches || [];
  const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || "");

  // Fetch branches (Admin only)
  useEffect(() => {
    if (role === "admin") {
      appData?.loadBranches();
    }
  }, [role]);

  // Fetch low stock data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const params = {};
      if (role === "admin" && selectedBranch && selectedBranch !== "ALL") {
        params.branch_id = selectedBranch;
      }

      try {
        const res = await fetchLowStockProducts(params);
        setLowStockProducts(res?.alerts || []);
      } catch (error) {
        setLowStockProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, selectedBranch]);

  const columns = [
    {
      name: "#",
      selector: (_, index) => index + 1,
      width: "80px",
      center: true,
    },
    {
      name: "Product",
      cell: (row) => (
        <div>
          <div className="font-semibold text-2xl mb-6 mt-6">
            {row.product_name}
          </div>
          <div className="text-gray-400 text-2xl mb-6">SKU: {row.sku}</div>
        </div>
      ),
      width: "200px",
      grow: 2,
    },
    {
      name: "Batch No.",
      cell: (row) => (
        <div>
          <div className="text-2xl">{row.batch_no}</div>
        </div>
      ),
      width: "90px",
      grow: 2,
    },
    {
      name: "Branch Name",
      cell: (row) => (
        <div>
          <div className="text-2xl">{row.branch_name}</div>
        </div>
      ),
      grow: 2,
    },
    {
      name: "Stock",
      cell: (row) => <span className="text-2xl">{row.available_qty}</span>,
      right: true,
      sortable: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xl font-medium ${
            row.severity === "out of stock"
              ? "bg-red-100 text-red-600"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {row.severity}
        </span>
      ),
    },
  ];

  const handleChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-4xl font-bold mb-10">Low Stock Alerts</h3>

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
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : lowStockProducts.length ? (
        <DataTable
          columns={columns}
          data={lowStockProducts}
          pagination
          paginationPerPage={5}
          paginationRowsPerPageOptions={[5, 10, 20]}
          highlightOnHover
          responsive
          striped
          noDataComponent="No data available"
        />
      ) : (
        <p className="text-gray-500 text-center text-2xl">
          No low stock items found
        </p>
      )}
    </div>
  );
};

export default LowStockAlert;
