import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

const AppDataContext = createContext(null);

const CACHE_TTL = 5 * 60 * 1000; // 5 minute
const expiredProductsCache = {};
const expiredProductsInFlight = {};

function getExpiredProductsCacheKey(filters) {
  return JSON.stringify({
    date_range: filters?.date_range || "this_month",
    branch_id: filters?.branch_id || "",
    date_from: filters?.date_from || "",
    date_to: filters?.date_to || "",
  });
}

function fetchExpiredProducts(filters, { force = false } = {}) {
  ensureCacheOwner();

  const cacheKey = getExpiredProductsCacheKey(filters);
  const now = Date.now();

  const cached = expiredProductsCache[cacheKey];

  if (
    !force &&
    cached &&
    now - cached.timestamp < CACHE_TTL
  ) {
    return Promise.resolve(cached.data);
  }

  if (expiredProductsInFlight[cacheKey]) {
    return expiredProductsInFlight[cacheKey];
  }

  const params = {
    date_range: filters?.date_range || "this_month",
    branch_id: filters?.branch_id || null,
  };

  if (filters?.date_range === "custom") {
    params.date_from = filters?.date_from || "";
    params.date_to = filters?.date_to || "";
  }

  expiredProductsInFlight[cacheKey] = axios
    .get("/api/expired-products", { params })
    .then((res) => {
      const data = res.data;

      expiredProductsCache[cacheKey] = {
        data,
        timestamp: Date.now(),
      };

      return data;
    })
    .catch((err) => {
      console.error("Failed to load expired products", err);
      throw err;
    })
    .finally(() => {
      expiredProductsInFlight[cacheKey] = null;
    });

  return expiredProductsInFlight[cacheKey];
}

const ENDPOINTS = {
  branches: "/api/branches",
  managerBranches: "/api/manager/branches",
  categories: "/api/categories",
  brands: "/api/brands",
  gstRates: "/api/gst-rates",
  suppliers: "/api/suppliers",
  staff: "/api/staff",
  products: "/api/all-products",
  store: "STORE",
};

const toArray = (d) => {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
};

const RESPONSE_PATH = {
  branches: (res) => toArray(res.data?.branches ?? res.data?.data ?? res.data),
  managerBranches: (res) =>
    toArray(res.data?.branches ?? res.data?.data ?? res.data),
  categories: (res) => res.data?.categories ?? [],
  brands: (res) => res.data?.brands ?? [],
  gstRates: (res) => res.data?.gstRates ?? [],
  suppliers: (res) => res.data?.suppliers ?? [],
  // products: (res) => res.data?.products ?? [],
  products: (res) => {
    const products = res.data?.products ?? [];
    const rows = [];

    products.forEach((product) => {
      if (product.batches && product.batches.length > 0) {
        const grouped = {};

        product.batches.forEach((inv) => {
          const key = `${inv.batch_no}-${inv.batch_barcode}-${inv.mrp}-${inv.selling_price}`;

          if (!grouped[key]) {
            grouped[key] = {
              row_id: `inv-${product.id}-${key}`,
              inventory_ids: [inv.id],

              product_id: product.id,
              sku: product.sku,
              name: product.name,
              brand: product.brand,
              category: product.category,
              hsn_code: product.hsn_code,
              gst_rate: product.gst_rate,
              gst_inclusive: product.gst_inclusive,
              is_price_override: product.is_price_override,

              batch_no: inv.batch_no,

              mrp: Number(inv.mrp),
              selling_price: Number(inv.selling_price),

              qty: Number(inv.qty_available) || 0,
              free: Number(inv.free) || 0,

              cost_total:
                Number(inv.cost_price) *
                Number(inv.qty_available || 0),

              barcodes: new Set([inv.batch_barcode]),
            };
          } else {
            grouped[key].inventory_ids.push(inv.id);
            grouped[key].qty += Number(inv.qty_available) || 0;
            grouped[key].free += Number(inv.free) || 0;
            grouped[key].cost_total +=
              Number(inv.cost_price) *
              Number(inv.qty_available || 0);

            grouped[key].barcodes.add(inv.batch_barcode);
          }
        });

        Object.values(grouped).forEach((row) => {
          row.total_qty = row.qty + row.free;

          row.cost_price = row.qty
            ? (row.cost_total / row.qty).toFixed(2)
            : 0;

          row.show_barcode = row.barcodes.size === 1;
          row.barcode = row.show_barcode
            ? [...row.barcodes][0]
            : null;

          delete row.barcodes;

          rows.push(row);
        });
      } else {
        rows.push({
          row_id: `prod-${product.id}`,

          product_id: product.id,
          sku: product.sku,
          name: product.name,
          brand: product.brand,
          category: product.category,
          hsn_code: product.hsn_code,
          gst_rate: product.gst_rate,
          gst_inclusive: product.gst_inclusive,
          is_price_override: product.is_price_override,

          batch_no: "-",
          barcode: product.barcode ?? null,

          mrp: Number(product.min_price) || 0,
          selling_price: Number(product.min_price) || 0,
          cost_price: product.cost_price ?? 0,

          qty: 0,
          free: 0,
          total_qty: 0,
          show_barcode: !!product.barcode,
        });
      }
    });

    return rows;
  },
};

const lastFetched = {};
const inFlight = {};
const listeners = new Set();

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user_detail"))?.user || null;
  } catch (err) {
    return null;
  }
}

function getRole() {
  return getUser()?.role || null;
}

function notifyListeners(key, value) {
  listeners.forEach((fn) => fn(key, value));
}

let cacheOwner = null;

function ensureCacheOwner() {
  const uid = getUser()?.id ?? null;
  if (cacheOwner === uid) return;

  Object.keys(lastFetched).forEach((k) => delete lastFetched[k]);
  Object.keys(inFlight).forEach((k) => delete inFlight[k]);

  if (cacheOwner !== null) {
    [
      "branches",
      "managerBranches",
      "categories",
      "brands",
      "gstRates",
      "suppliers",
      "staff",
      "products",
    ].forEach((k) => notifyListeners(k, []));
    notifyListeners("store", null);
    notifyListeners("stockExpiryAlerts", { list: [], total: 0 });
  }

  cacheOwner = uid;
}

function fetchKey(key, { force = false, storeId } = {}) {
  ensureCacheOwner();

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
  ensureCacheOwner();

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
    products: [],
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

  // const invalidate = useCallback((key) => {
  //   lastFetched[key] = 0;
  // }, []);
  const invalidate = useCallback((key) => {
  if (key === "expiredProducts") {
    Object.keys(expiredProductsCache).forEach(
      (cacheKey) => delete expiredProductsCache[cacheKey]
    );

    Object.keys(expiredProductsInFlight).forEach(
      (cacheKey) => delete expiredProductsInFlight[cacheKey]
    );

    return;
  }

  lastFetched[key] = 0;
}, []);

  const isManager = getRole() === "manager";

  const value = {
    ...data,

    branches: isManager ? data.managerBranches : data.branches,

    stockExpiryAlerts: alerts.list,
    stockExpiryTotal: alerts.total,

    loadBranches: (opts) =>
      load(getRole() === "manager" ? "managerBranches" : "branches", opts),
    loadManagerBranches: (opts) => load("managerBranches", opts),
    loadCategories: () => load("categories"),
    loadBrands: () => load("brands"),
    loadGstRates: () => load("gstRates"),
    loadSuppliers: () => load("suppliers"),
    loadStaff: () => load("staff"),
    loadProducts: () => load("products"),
    loadExpiredProducts: (filters, opts) =>
      fetchExpiredProducts(filters, opts),
    loadStore,
    loadStockExpiryAlerts,

    invalidate,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
