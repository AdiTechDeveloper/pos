import { useState, useEffect } from "react";
import { fetchLowStockProducts } from "../utils/reportService";
import DataTable from "react-data-table-component";
import { useAppData } from "../context/AppDataContext";
import { AlertTriangle, XCircle } from "lucide-react";

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
      width: "60px",
      center: true,
      cell: (_, index) => (
        <span className="text-xl text-gray-400">{index + 1}</span>
      ),
    },
    {
      name: "Product",
      cell: (row) => (
        <div className="py-2">
          <div className="font-semibold text-xl text-gray-800">
            {row.product_name}
          </div>
          <div className="text-gray-400 text-xl mt-0.5">SKU: {row.sku}</div>
        </div>
      ),
      grow: 2,
    },
    {
      name: "Batch No.",
      selector: (row) => row.batch_no,
      cell: (row) => <span className="text-xl text-gray-600">{row.batch_no}</span>,
      grow: 1,
    },
    {
      name: "Branch",
      selector: (row) => row.branch_name,
      cell: (row) => <span className="text-xl text-gray-600">{row.branch_name}</span>,
      grow: 1.5,
    },
    {
      name: "Stock",
      selector: (row) => row.available_qty,
      sortable: true,
      right: true,
      cell: (row) => (
        <span
          className={`text-xl font-bold ${
            row.severity === "out of stock" ? "text-rose-600" : "text-amber-600"
          }`}
        >
          {row.available_qty}
        </span>
      ),
    },
    {
      name: "Status",
      cell: (row) => {
        const isOut = row.severity === "out of stock";
        return (
          <span
            title={row.severity}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xl font-medium ${
              isOut
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isOut ? <XCircle size={13} /> : <AlertTriangle size={13} />}
            {row.severity}
          </span>
        );
      },
    },
  ];

  const handleChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-2xl font-bold text-gray-800">Low Stock Alerts</h3>

        {role === "admin" && (
          <select
            name="branch_id"
            value={selectedBranch}
            onChange={handleChange}
            className="border border-gray-300 rounded-lg px-3 py-2 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
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
          customStyles={{
            headCells: {
              style: {
                fontWeight: 600,
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                color: "#6B7280",
                backgroundColor: "#F9FAFB",
              },
            },
            cells: {
              style: {
                padding: "10px 16px",
              },
            },
          }}
          noDataComponent={
            <p className="text-xl text-gray-400 py-8">No data available</p>
          }
        />
      ) : (
        <p className="text-gray-400 text-center text-xl py-8">
          No low stock items found
        </p>
      )}
    </div>
  );
};

export default LowStockAlert;