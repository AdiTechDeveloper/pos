// import { useEffect, useState } from "react";
// import { fetchProfitLoss } from "../utils/reportService";

// export const useProfitLoss = (filters) => {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     setLoading(true);

//     fetchProfitLoss(filters)
//       .then((res) => setData(res))
//       .finally(() => setLoading(false));
//   }, [JSON.stringify(filters)]);

//   return { data, loading };
// };

import { useEffect, useState } from "react";
import { fetchProfitLoss } from "../utils/reportService";
import { useAppData } from "../context/AppDataContext";

export const useProfitLoss = (filters) => {
  const { dashboard } = useAppData();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const isToday =
      filters?.from_date &&
      filters?.to_date &&
      filters.from_date === filters.to_date &&
      filters.from_date ===
        new Date().toISOString().slice(0, 10);

    const hasBranchFilter =
      filters?.branch_id && filters.branch_id !== "ALL";

    // Dashboard already contains today's default P&L.
    // Avoid another API call.
    if (
      isToday &&
      !hasBranchFilter &&
      dashboard?.profitLossToday
    ) {
      setData(dashboard.profitLossToday);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchProfitLoss(filters)
      .then((res) => {
        if (mounted) {
          setData(res);
        }
      })
      .catch(() => {
        if (mounted) {
          setData(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    JSON.stringify(filters),
    dashboard?.profitLossToday,
  ]);

  return { data, loading };
};
