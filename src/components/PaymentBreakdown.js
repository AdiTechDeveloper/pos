// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import DonutChart from "./DonutChart";
// import { Wallet } from "lucide-react";
// import { useAppData } from "../context/AppDataContext";

// const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// const rupee = (v) => `₹${Number(v || 0).toFixed(2)}`;

// const PALETTE = [
//   "#23C55E",
//   "#2377FC",
//   "#8B5CF6",
//   "#F59E0B",
//   "#FC2359",
//   "#06B6D4",
// ];

// const PaymentBreakdown = ({ role, user, filters = {}, storeId }) => {
//   const appData = useAppData();
//   const branches = appData?.branches || [];
//   const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || "");
//   const [report, setReport] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Fetch branches list (admin only — needed to populate the dropdown)
//   useEffect(() => {
//     if (role === "admin") {
//       appData?.loadBranches();
//     }
//   }, [role]);

//   // Fetch today's collection, scoped to whichever branch is selected
//   useEffect(() => {
//     const fetchPayment = async () => {
//       setLoading(true);

//       const params = {
//         date_range: "today",
//         bill_status: "all",
//       };

//       if (role === "admin" && selectedBranch && selectedBranch !== "ALL") {
//         params.branch_id = selectedBranch;
//       } else if (
//         role === "manager" &&
//         filters.branch_id &&
//         filters.branch_id !== "ALL"
//       ) {
//         params.branch_id = filters.branch_id;
//       }
//       if (storeId) {
//         params.store_id = storeId;
//       }

//       try {
//         const res = await axios.get(`${BASE_URL}/api/reports/sales-report`, {
//           headers: {
//             Accept: "application/json",
//             Authorization: `Bearer ${user?.token}`,
//           },
//           params,
//         });
//         setReport(res.data);
//       } catch (err) {
//         setReport(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPayment();
//   }, [role, selectedBranch, filters.branch_id, storeId, user?.token]);

//   const handleChange = (e) => {
//     setSelectedBranch(e.target.value);
//   };

//   const branchSelector = role === "admin" && (
//     <select
//       name="branch_id"
//       value={selectedBranch}
//       onChange={handleChange}
//       className="border border-gray-300 rounded-lg px-3 py-1.5 text-xl focus:ring-2 focus:ring-blue-400 outline-none"
//       style={{ width: 200 }}
//     >
//       <option value="">All Branches</option>
//       {branches.map((b) => (
//         <option key={b.id} value={b.id}>
//           {b.name}
//         </option>
//       ))}
//     </select>
//   );

//   if (loading) {
//     return (
//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
//         <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
//         <div className="h-64 w-full bg-gray-50 rounded animate-pulse" />
//       </div>
//     );
//   }

//   const rows = report?.payment_methods?.rows || [];
//   const grandTotal =
//     report?.payment_methods?.grand_total ??
//     rows.reduce((s, r) => s + (Number(r.total_collected) || 0), 0);
//   const due = report?.kpis?.total_due ?? 0;

//   if (rows.length === 0) {
//     return (
//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
//         <div className="flex items-center justify-between mb-2">
//           <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
//             <Wallet size={20} className="text-blue-600" />
//             Today's Collection
//           </h3>
//           {branchSelector}
//         </div>
//         <p className="text-xl text-gray-400">No bills created today.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
//       <div className="flex items-center justify-between mb-6">
//         <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
//           <Wallet size={20} className="text-blue-600" />
//           Today's Collection
//         </h3>
//         <div className="flex items-center gap-3">
//           <span className="text-2xl text-gray-400">
//             Collected:{" "}
//             <span className="text-2xl text-gray-700">{rupee(grandTotal)}</span>
//           </span>
//           {branchSelector}
//         </div>
//       </div>

//       <DonutChart
//         centerLabel="Collected"
//         formatValue={rupee}
//         size={220}
//         thickness={28}
//         centered
//         data={rows.map((r, i) => ({
//           label: r.method,
//           value: Number(r.total_collected) || 0,
//           color: PALETTE[i % PALETTE.length],
//         }))}
//       />

//       {due > 0 && (
//         <div className="mt-6 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
//           <span className="text-xl font-medium text-amber-700">
//             Pending (not yet collected)
//           </span>
//           <span className="text-xl font-bold text-amber-700">{rupee(due)}</span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PaymentBreakdown;
import React, { useEffect, useState } from "react";
import axios from "axios";
import DonutChart from "./DonutChart";
import { Wallet } from "lucide-react";
import { useAppData } from "../context/AppDataContext";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const rupee = (v) => `₹${Number(v || 0).toFixed(2)}`;

const PALETTE = [
  "#23C55E",
  "#2377FC",
  "#8B5CF6",
  "#F59E0B",
  "#FC2359",
  "#06B6D4",
];

const PaymentBreakdown = ({ role, user, filters = {}, storeId }) => {
  const {
    branches,
    loadBranches,
    dashboard,
  } = useAppData();

  const [selectedBranch, setSelectedBranch] = useState(
    filters.branch_id || ""
  );

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load branches from AppDataContext cache
  useEffect(() => {
    if (role === "admin") {
      loadBranches();
    }
  }, [role, loadBranches]);

  useEffect(() => {
    let mounted = true;

    const fetchPayment = async () => {
      /*
       * Default dashboard view:
       * Use already loaded Dashboard sales data.
       *
       * This avoids another /sales-report API call.
       */
      const isAllBranches =
        role === "admin" &&
        (!selectedBranch || selectedBranch === "ALL");

      if (isAllBranches && dashboard?.todaySales) {
        setReport(dashboard.todaySales);
        setLoading(false);
        return;
      }

      /*
       * Manager dashboard already has today's sales data
       * for his own branch.
       */
      const isManagerDashboard =
        role === "manager" &&
        (!filters.branch_id || filters.branch_id === "ALL");

      if (isManagerDashboard && dashboard?.todaySales) {
        setReport(dashboard.todaySales);
        setLoading(false);
        return;
      }

      /*
       * Only call API when a different branch is selected.
       */
      const params = {
        date_range: "today",
        bill_status: "all",
      };

      if (
        role === "admin" &&
        selectedBranch &&
        selectedBranch !== "ALL"
      ) {
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
          setReport(res.data);
        }
      } catch (err) {
        if (mounted) {
          setReport(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPayment();

    return () => {
      mounted = false;
    };
  }, [
    dashboard?.todaySales
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-64 w-full bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  const rows = report?.payment_methods?.rows || [];

  const grandTotal =
    report?.payment_methods?.grand_total ??
    rows.reduce(
      (s, r) => s + (Number(r.total_collected) || 0),
      0
    );

  const due = report?.kpis?.total_due ?? 0;

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet size={20} className="text-blue-600" />
            Today's Collection
          </h3>

          {branchSelector}
        </div>

        <p className="text-xl text-gray-400">
          No bills created today.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Wallet size={20} className="text-blue-600" />
          Today's Collection
        </h3>

        <div className="flex items-center gap-3">
          <span className="text-2xl text-gray-400">
            Collected:{" "}
            <span className="text-2xl text-gray-700">
              {rupee(grandTotal)}
            </span>
          </span>

          {branchSelector}
        </div>
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