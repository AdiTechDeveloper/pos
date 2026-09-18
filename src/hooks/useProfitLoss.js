import { useEffect, useState } from "react";
import { fetchProfitLoss } from "../utils/reportService";

export const useProfitLoss = (filters) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetchProfitLoss(filters)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  return { data, loading };
};
