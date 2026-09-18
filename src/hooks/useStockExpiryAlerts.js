import { useEffect } from "react";
import { useAppData } from "../context/AppDataContext";

export default function useStockExpiryAlerts() {
  const appData = useAppData();

  useEffect(() => {
    appData?.loadStockExpiryAlerts();

    const interval = setInterval(
      () => {
        appData?.loadStockExpiryAlerts({ force: true });
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [appData]);

  return {
    alerts: appData?.stockExpiryAlerts || [],
    total: appData?.stockExpiryTotal || 0,
    loading: false,
  };
}
