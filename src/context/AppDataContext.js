import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

const AppDataContext = createContext(null);

const CACHE_TTL = 5 * 60 * 1000; // 5 minute

const ENDPOINTS = {
  branches: "/api/branches",
  managerBranches: "/api/manager/branches",
  categories: "/api/categories",
  brands: "/api/brands",
  gstRates: "/api/gst-rates",
  suppliers: "/api/suppliers",
  staff: "/api/staff",
  store: "STORE",
};

const RESPONSE_PATH = {
  managerBranches: (res) => res.data?.branches ?? [],
  categories: (res) => res.data?.categories ?? [],
  brands: (res) => res.data?.brands ?? [],
  gstRates: (res) => res.data?.gstRates ?? [],
  suppliers: (res) => res.data?.suppliers ?? [],
};

const lastFetched = {};
const inFlight = {};
const listeners = new Set();

function notifyListeners(key, value) {
  listeners.forEach((fn) => fn(key, value));
}

function fetchKey(key, { force = false, storeId } = {}) {
  const now = Date.now();
  if (!force && lastFetched[key] && now - lastFetched[key] < CACHE_TTL) {
    return Promise.resolve();
  }
  if (inFlight[key]) {
    return inFlight[key];
  }

  const url = key === "store" ? `/api/stores/${storeId}` : ENDPOINTS[key];
  if (!url) return Promise.resolve();

  inFlight[key] = axios
    .get(url)
    .then((res) => {
      const value = RESPONSE_PATH[key]
        ? RESPONSE_PATH[key](res)
        : (res.data?.data ?? res.data ?? []);
      lastFetched[key] = Date.now();
      notifyListeners(key, value);
    })
    .catch((err) => {
      console.error(`Failed to load ${key}`, err);
    })
    .finally(() => {
      inFlight[key] = null;
    });

  return inFlight[key];
}

function fetchStockExpiryAlerts({ force = false } = {}) {
  const key = "stockExpiryAlerts";
  const now = Date.now();
  if (!force && lastFetched[key] && now - lastFetched[key] < CACHE_TTL) {
    return Promise.resolve();
  }
  if (inFlight[key]) {
    return inFlight[key];
  }

  inFlight[key] = axios
    .get("/api/stock-expiry-alerts")
    .then((res) => {
      lastFetched[key] = Date.now();
      notifyListeners(key, {
        list: res.data.alerts || [],
        total: res.data.total || 0,
      });
    })
    .catch((err) => console.error("Expiry alert fetch failed", err))
    .finally(() => {
      inFlight[key] = null;
    });

  return inFlight[key];
}

export function AppDataProvider({ children }) {
  const [data, setData] = useState({
    branches: [],
    managerBranches: [],
    categories: [],
    brands: [],
    gstRates: [],
    suppliers: [],
    staff: [],
    store: null,
  });
  const [alerts, setAlerts] = useState({ list: [], total: 0 });

  React.useEffect(() => {
    const listener = (key, value) => {
      if (key === "stockExpiryAlerts") {
        setAlerts(value);
      } else {
        setData((prev) => ({ ...prev, [key]: value }));
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const load = useCallback((key, opts) => fetchKey(key, opts), []);

  const loadStore = useCallback((storeId, opts) => {
    return fetchKey("store", { ...opts, storeId });
  }, []);

  const loadStockExpiryAlerts = useCallback(
    (opts) => fetchStockExpiryAlerts(opts),
    [],
  );

  const invalidate = useCallback((key) => {
    lastFetched[key] = 0;
  }, []);

  const value = {
    ...data,
    stockExpiryAlerts: alerts.list,
    stockExpiryTotal: alerts.total,

    loadBranches: () => load("branches"),
    loadManagerBranches: () => load("managerBranches"),
    loadCategories: () => load("categories"),
    loadBrands: () => load("brands"),
    loadGstRates: () => load("gstRates"),
    loadSuppliers: () => load("suppliers"),
    loadStaff: () => load("staff"),
    loadStore,
    loadStockExpiryAlerts,

    invalidate,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
