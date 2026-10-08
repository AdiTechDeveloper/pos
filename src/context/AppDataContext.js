import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import { hasFeature } from "../utils/hasFeature";

const AppDataContext = createContext(null);

// 8 hours
const CACHE_TTL = 8 * 60 * 60 * 1000;

const expiredProductsCache = {};
const expiredProductsInFlight = {};

const dashboardCache = {};
const dashboardInFlight = {};
const monthlySalesCache = {};
const monthlySalesInFlight = {};

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
  purchaseProducts: "/api/all-products",
  purchaseBills: "/api/purchase-bill",
  saleProducts: "/api/products",
  saleBills: "/api/sales-bills",
  purchaseLines: "/api/purchase-line",
  purchaseReturns: "/api/purchase-return",
  saleReturns: "/api/sales-return",
  customers: "/api/customers",
  advancePayments: "/api/reports/advance-payments",
  store: "STORE",
};

const toArray = (d) => {
  if (Array.isArray(d)) return d;

  if (d && Array.isArray(d.data)) {
    return d.data;
  }

  return [];
};

const RESPONSE_PATH = {
  branches: (res) =>
    toArray(
      res.data?.branches ??
      res.data?.data ??
      res.data
    ),

  managerBranches: (res) =>
    toArray(
      res.data?.branches ??
      res.data?.data ??
      res.data
    ),

  categories: (res) =>
    res.data?.categories ?? [],

  brands: (res) =>
    res.data?.brands ?? [],

  gstRates: (res) =>
    res.data?.gstRates ?? [],

  suppliers: (res) =>
    res.data?.suppliers ?? [],

  products: (res) => {
    const products = res.data?.products ?? [];
    const rows = [];

    products.forEach((product) => {
      if (
        product.batches &&
        product.batches.length > 0
      ) {
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
              is_price_override:
                product.is_price_override,

              batch_no: inv.batch_no,

              mrp: Number(inv.mrp),
              selling_price:
                Number(inv.selling_price),

              qty:
                Number(inv.qty_available) || 0,

              free:
                Number(inv.free) || 0,

              cost_total:
                Number(inv.cost_price) *
                Number(
                  inv.qty_available || 0
                ),

              barcodes: new Set([
                inv.batch_barcode,
              ]),
            };
          } else {
            grouped[key].inventory_ids.push(
              inv.id
            );

            grouped[key].qty +=
              Number(inv.qty_available) || 0;

            grouped[key].free +=
              Number(inv.free) || 0;

            grouped[key].cost_total +=
              Number(inv.cost_price) *
              Number(
                inv.qty_available || 0
              );

            grouped[key].barcodes.add(
              inv.batch_barcode
            );
          }
        });

        Object.values(grouped).forEach(
          (row) => {
            row.total_qty =
              row.qty + row.free;

            row.cost_price = row.qty
              ? (
                row.cost_total / row.qty
              ).toFixed(2)
              : 0;

            row.show_barcode =
              row.barcodes.size === 1;

            row.barcode = row.show_barcode
              ? [...row.barcodes][0]
              : null;

            delete row.barcodes;

            rows.push(row);
          }
        );
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
          is_price_override:
            product.is_price_override,

          batch_no: "-",
          barcode: product.barcode ?? null,

          mrp:
            Number(product.min_price) || 0,

          selling_price:
            Number(product.min_price) || 0,

          cost_price:
            product.cost_price ?? 0,

          qty: 0,
          free: 0,
          total_qty: 0,
          show_barcode:
            !!product.barcode,
        });
      }
    });

    return rows;
  },

  purchaseProducts: (res) =>
    (res.data?.products || []).sort(
      (a, b) =>
        (a.name || "").localeCompare(
          b.name || "",
          undefined,
          {
            sensitivity: "base",
          }
        )
    ),

  purchaseBills: (res) =>
    res.data?.data ?? [],

  saleProducts: (res) =>
    res.data?.products || [],

  saleBills: (res) =>
    res.data?.data ?? [],

  purchaseLines: (res) =>
    res.data?.data ?? [],

  purchaseReturns: (res) =>
    res.data?.data ?? [],

  saleReturns: (res) =>
    res.data?.data?.data ??
    res.data?.data ??
    [],

  customers: (res) =>
    res.data?.data ??
    res.data?.customers ??
    res.data ??
    [],

  advancePayments: (res) =>
    res.data?.data ?? [],
};

const lastFetched = {};
const inFlight = {};
const listeners = new Set();

function getUser() {
  try {
    return (
      JSON.parse(
        localStorage.getItem("user_detail")
      )?.user || null
    );
  } catch (err) {
    return null;
  }
}
function getToken() {
  try {
    return (
      JSON.parse(
        localStorage.getItem("user_detail")
      )?.token || null
    );
  } catch (err) {
    return null;
  }
}


function getRole() {
  return getUser()?.role || null;
}

function notifyListeners(key, value) {
  listeners.forEach((fn) =>
    fn(key, value)
  );
}

let cacheOwner = null;

function ensureCacheOwner() {
  const uid = getUser()?.id ?? null;

  if (cacheOwner === uid) {
    return;
  }

  Object.keys(lastFetched).forEach(
    (k) => delete lastFetched[k]
  );

  Object.keys(inFlight).forEach(
    (k) => delete inFlight[k]
  );

  Object.keys(dashboardCache).forEach(
    (k) => delete dashboardCache[k]
  );

  Object.keys(dashboardInFlight).forEach(
    (k) => delete dashboardInFlight[k]
  );
  Object.keys(monthlySalesCache).forEach(
    (k) => delete monthlySalesCache[k]
  );

  Object.keys(monthlySalesInFlight).forEach(
    (k) => delete monthlySalesInFlight[k]
  );

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
      "purchaseBills",
      "saleProducts",
      "saleBills",
      "purchaseProducts",
      "purchaseLines",
      "purchaseReturns",
      "saleReturns",
      "customers",
      "advancePayments",
    ].forEach((k) =>
      notifyListeners(k, [])
    );

    notifyListeners("store", null);

    notifyListeners(
      "stockExpiryAlerts",
      {
        list: [],
        total: 0,
      }
    );

    notifyListeners(
      "dashboard",
      null
    );
  }

  cacheOwner = uid;
}

function getDashboardCacheKey() {
  const user = getUser();

  return JSON.stringify({
    userId: user?.id ?? null,

    role: user?.role ?? null,

    branchId:
      user?.branch_id ??
      user?.user?.branch_id ??
      user?.user?.branch_ids?.[0] ??
      user?.branch_ids?.[0] ??
      null,

    storeId:
      user?.store_id ??
      user?.user?.store_id ??
      null,
  });
}

function fetchKey(
  key,
  { force = false, storeId } = {}
) {
  ensureCacheOwner();

  const now = Date.now();

  if (
    !force &&
    lastFetched[key] &&
    now - lastFetched[key] <
    CACHE_TTL
  ) {
    return Promise.resolve();
  }

  if (inFlight[key]) {
    return inFlight[key];
  }

  const url =
    key === "store"
      ? `/api/stores/${storeId}`
      : ENDPOINTS[key];

  if (!url) {
    return Promise.resolve();
  }

  inFlight[key] = axios
    .get(url)
    .then((res) => {
      const value = RESPONSE_PATH[key]
        ? RESPONSE_PATH[key](res)
        : res.data?.data ??
        res.data ??
        [];

      lastFetched[key] =
        Date.now();

      notifyListeners(
        key,
        value
      );
    })
    .catch((err) => {
      console.error(
        `Failed to load ${key}`,
        err
      );
    })
    .finally(() => {
      inFlight[key] = null;
    });

  return inFlight[key];
}

function fetchStockExpiryAlerts({
  force = false,
} = {}) {
  ensureCacheOwner();

  const key =
    "stockExpiryAlerts";

  const now = Date.now();

  if (
    !force &&
    lastFetched[key] &&
    now - lastFetched[key] <
    CACHE_TTL
  ) {
    return Promise.resolve();
  }

  if (inFlight[key]) {
    return inFlight[key];
  }

  inFlight[key] = axios
    .get("/api/stock-expiry-alerts")
    .then((res) => {
      lastFetched[key] =
        Date.now();

      notifyListeners(
        key,
        {
          list:
            res.data.alerts || [],
          total:
            res.data.total || 0,
        }
      );
    })
    .catch((err) => {
      console.error(
        "Expiry alert fetch failed",
        err
      );
    })
    .finally(() => {
      inFlight[key] = null;
    });

  return inFlight[key];
}
function fetchMonthlySales(
  branchId = null,
  {
    storeId = null,
    year = new Date().getFullYear(),
    force = false,
  } = {}
) {
  ensureCacheOwner();

  const user = getUser();
  const token = getToken();

  if (!token) {
    return Promise.resolve(null);
  }

  const cacheKey = JSON.stringify({
    userId: user?.id ?? null,
    year,
    branchId: branchId || null,
    storeId: storeId || null,
  });

  const now = Date.now();
  const cached = monthlySalesCache[cacheKey];

  if (
    !force &&
    cached &&
    now - cached.timestamp < CACHE_TTL
  ) {
    return Promise.resolve(cached.data);
  }

  if (monthlySalesInFlight[cacheKey]) {
    return monthlySalesInFlight[cacheKey];
  }

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  const params = {
    year,
    bill_status: "all",
    store_id: storeId || null,
    branch_id: branchId || null,
  };

  monthlySalesInFlight[cacheKey] = axios
    .get("/api/reports/monthly-sales", {
      headers: authHeaders,
      params,
    })
    .then((res) => {
      const data = res.data?.monthly_sales || {};

      monthlySalesCache[cacheKey] = {
        data,
        timestamp: Date.now(),
      };

      return data;
    })
    .catch((err) => {
      console.error(
        "Failed to load monthly sales",
        err
      );

      throw err;
    })
    .finally(() => {
      monthlySalesInFlight[cacheKey] = null;
    });

  return monthlySalesInFlight[cacheKey];
}



function fetchDashboard({
  force = false,
} = {}) {
  ensureCacheOwner();

  const cacheKey =
    getDashboardCacheKey();

  const now = Date.now();

  const cached =
    dashboardCache[cacheKey];

  if (
    !force &&
    cached &&
    now - cached.timestamp <
    CACHE_TTL
  ) {
    notifyListeners(
      "dashboard",
      cached.data
    );

    return Promise.resolve(
      cached.data
    );
  }

  if (
    dashboardInFlight[cacheKey]
  ) {
    return dashboardInFlight[
      cacheKey
    ];
  }

  const user = getUser();
  const role = user?.role;

  if (!role) {
    return Promise.resolve(null);
  }

  const managerBranchId =
    role === "manager"
      ? user?.branch_id ??
      user?.user?.branch_id ??
      user?.user?.branch_ids?.[0] ??
      user?.branch_ids?.[0] ??
      null
      : null;

  const adminStoreId =
    role === "admin"
      ? user?.store_id ??
      user?.user?.store_id ??
      null
      : null;

  const authHeaders = {
    Accept:
      "application/json",

    Authorization:
      `Bearer ${user?.token}`,
  };

  const get = (path, params) =>
    axios.get(path, {
      headers: authHeaders,
      params,
    });

  dashboardInFlight[
    cacheKey
  ] = (async () => {
    try {
      // SUPERADMIN
      if (role === "superadmin") {
        const res =
          await get("/api/stores");

        const data = {
          role,

          stores:
            res.data.data || [],

          todaySales: null,

          todayPurchase: null,

          monthProducts: [],

          customerDues: [],

          saleBills: [],

          recentInvoices: [],

          profitLossToday: null,

          lowStockProducts: [],
          // monthlySales: null,
        };

        dashboardCache[
          cacheKey
        ] = {
          data,
          timestamp:
            Date.now(),
        };

        notifyListeners(
          "dashboard",
          data
        );

        return data;
      }

      // ADMIN / MANAGER
      const jobs = [];

      const canSales =
        hasFeature(
          "reports_sales"
        );

      const canPurchase =
        hasFeature(
          "reports_purchase"
        );

      const canFinancial =
        hasFeature(
          "reports_financial"
        );

      const canStock =
        hasFeature(
          "stock_alerts"
        );

      const canCustomers =
        hasFeature(
          "customers"
        );

      const canBills =
        hasFeature(
          "sales_bills"
        );

      if (canSales) {
        jobs.push([
          "salesToday",

          get(
            "/api/reports/sales-report",
            {
              date_range:
                "today",

              bill_status:
                "all",

              branch_id:
                managerBranchId,

              store_id:
                adminStoreId,
            }
          ),
        ]);

        jobs.push([
          "salesMonth",

          get(
            "/api/reports/sales-report",
            {
              date_range:
                "this_month",

              bill_status:
                "all",

              branch_id:
                managerBranchId,

              store_id:
                adminStoreId,
            }
          ),
        ]);
        // if (canSales) {
        //   jobs.push([
        //     "salesToday",
        //     get("/api/reports/sales-report", {
        //       date_range: "today",
        //       bill_status: "all",
        //       branch_id: managerBranchId,
        //       store_id: adminStoreId,
        //     }),
        //   ]);

        //   jobs.push([
        //     "salesMonth",
        //     get("/api/reports/sales-report", {
        //       date_range: "this_month",
        //       bill_status: "all",
        //       branch_id: managerBranchId,
        //       store_id: adminStoreId,
        //     }),
        //   ]);

        //   // jobs.push([
        //   //   "monthlySales",
        //   //   get("/api/reports/monthly-sales", {
        //   //     year: new Date().getFullYear(),
        //   //     bill_status: "all",
        //   //     branch_id: managerBranchId,
        //   //     store_id: adminStoreId,
        //   //   }),
        //   // ]);
        // }
      }

      if (canFinancial) {
        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        jobs.push([
          "profitLossToday",

          get(
            "/api/reports/profit-loss",
            {
              from_date: today,

              to_date: today,

              branch_id:
                managerBranchId,

              store_id:
                adminStoreId,
            }
          ),
        ]);
      }

      if (canPurchase) {
        jobs.push([
          "purchaseToday",

          get(
            "/api/reports/purchase-report",
            {
              date_range:
                "today",

              store_id:
                adminStoreId,
            }
          ),
        ]);
      }

      if (canStock) {
        jobs.push([
          "lowStock",

          get(
            "/api/stock-alerts",
            {
              branch_id:
                managerBranchId,

              store_id:
                adminStoreId,
            }
          ),
        ]);
      }

      if (canCustomers) {
        jobs.push([
          "dues",

          get(
            "/api/customer/due"
          ),
        ]);
      }

      if (canBills) {
        jobs.push([
          "bills",

          get(
            "/api/sales-bills"
          ),
        ]);
      }

      const results =
        await Promise.allSettled(

          jobs.map(
            ([, promise]) =>
              promise
          )
        );

      const data = {
        role,

        stores: [],

        todaySales: null,

        todayPurchase: null,

        monthProducts: [],

        customerDues: [],

        saleBills: [],

        recentInvoices: [],

        profitLossToday:
          null,

        lowStockProducts: [],
      };

      results.forEach(
        (result, index) => {
          const key =
            jobs[index][0];

          if (
            result.status !==
            "fulfilled"
          ) {
            console.warn(
              `Dashboard: "${key}" load nahi hua`,
              result.reason
                ?.message
            );

            return;
          }

          const response =
            result.value.data;

          if (
            key ===
            "salesToday"
          ) {
            data.todaySales =
              response;
          }

          if (
            key ===
            "salesMonth"
          ) {
            data.monthProducts =
              response?.products
                ?.rows || [];

            data.recentInvoices =
              response?.invoices
                ?.rows || [];
          }
          // if (key === "monthlySales") {
          //   data.monthlySales =
          //     response?.monthly_sales || {};
          // }

          if (
            key ===
            "purchaseToday"
          ) {
            data.todayPurchase =
              response;
          }

          if (
            key === "dues"
          ) {
            data.customerDues =
              response?.data || [];
          }

          if (
            key === "bills"
          ) {
            data.saleBills =
              response?.data || [];
          }

          if (
            key ===
            "profitLossToday"
          ) {
            data.profitLossToday =
              response;
          }

          if (
            key === "lowStock"
          ) {
            data.lowStockProducts =
              response?.alerts ||
              [];
          }
        }
      );

      dashboardCache[
        cacheKey
      ] = {
        data,

        timestamp:
          Date.now(),
      };

      notifyListeners(
        "dashboard",
        data
      );

      return data;
    } finally {
      dashboardInFlight[
        cacheKey
      ] = null;
    }
  })();

  return dashboardInFlight[
    cacheKey
  ];
}


export function AppDataProvider({
  children,
}) {
  const [data, setData] =
    useState({
      branches: [],

      managerBranches: [],

      categories: [],

      brands: [],

      gstRates: [],

      suppliers: [],

      staff: [],

      products: [],

      purchaseProducts: [],

      purchaseBills: [],

      saleProducts: [],

      saleBills: [],

      purchaseLines: [],

      purchaseReturns: [],

      saleReturns: [],

      customers: [],

      advancePayments: [],
      monthlySales: {
        "1": 85000,
        "2": 92000,
        "3": 0,
        "4": 110000,
      },

      store: null,
    });

  const [alerts, setAlerts] =
    useState({
      list: [],
      total: 0,
    });

  const [dashboard, setDashboard] =
    useState(null);

  React.useEffect(() => {
    const listener = (
      key,
      value
    ) => {
      if (
        key ===
        "stockExpiryAlerts"
      ) {
        setAlerts(value);
      } else if (
        key === "dashboard"
      ) {
        setDashboard(value);
      } else {
        setData((prev) => ({
          ...prev,
          [key]: value,
        }));
      }
    };

    listeners.add(listener);

    return () =>
      listeners.delete(
        listener
      );
  }, []);

  const load = useCallback(
    (key, opts) =>
      fetchKey(key, opts),
    []
  );

  const loadStore =
    useCallback(
      (storeId, opts) => {
        return fetchKey(
          "store",
          {
            ...opts,
            storeId,
          }
        );
      },
      []
    );

  const loadStockExpiryAlerts =
    useCallback(
      (opts) =>
        fetchStockExpiryAlerts(
          opts
        ),
      []
    );

  const loadAdvancePayments =
    useCallback(
      (opts) =>
        load(
          "advancePayments",
          opts
        ),
      [load]
    );

  const loadDashboard =
    useCallback(
      (opts) =>
        fetchDashboard(opts),
      []
    );

  const loadMonthlySales = useCallback(
    (branchId = null, opts = {}) =>
      fetchMonthlySales(branchId, opts),
    []
  );

  const invalidate =
    useCallback(
      (key) => {
        if (
          key === "dashboard"
        ) {
          Object.keys(
            dashboardCache
          ).forEach(
            (cacheKey) =>
              delete dashboardCache[
              cacheKey
              ]
          );

          Object.keys(
            dashboardInFlight
          ).forEach(
            (cacheKey) =>
              delete dashboardInFlight[
              cacheKey
              ]
          );

          setDashboard(null);

          return;
        }

        if (
          key ===
          "expiredProducts"
        ) {
          Object.keys(
            expiredProductsCache
          ).forEach(
            (cacheKey) =>
              delete expiredProductsCache[
              cacheKey
              ]
          );

          Object.keys(
            expiredProductsInFlight
          ).forEach(
            (cacheKey) =>
              delete expiredProductsInFlight[
              cacheKey
              ]
          );

          return;
        }

        lastFetched[key] = 0;
      },
      []
    );

  const isManager =
    getRole() === "manager";

  const value = {
    ...data,

    dashboard,

    loadDashboard,
    loadMonthlySales,

    branches: isManager
      ? data.managerBranches
      : data.branches,

    stockExpiryAlerts:
      alerts.list,

    stockExpiryTotal:
      alerts.total,

    loadBranches: (opts) =>
      load(
        getRole() ===
          "manager"
          ? "managerBranches"
          : "branches",
        opts
      ),

    loadManagerBranches: (
      opts
    ) =>
      load(
        "managerBranches",
        opts
      ),

    loadCategories: () =>
      load("categories"),

    loadBrands: () =>
      load("brands"),

    loadGstRates: () =>
      load("gstRates"),

    loadSuppliers: () =>
      load("suppliers"),

    loadStaff: () =>
      load("staff"),

    loadProducts: () =>
      load("products"),

    loadExpiredProducts: (
      filters,
      opts
    ) =>
      fetchExpiredProducts(
        filters,
        opts
      ),

    loadPurchaseBills: (
      opts
    ) =>
      load(
        "purchaseBills",
        opts
      ),

    loadPurchaseProducts: () =>
      load(
        "purchaseProducts"
      ),

    loadSaleProducts: () =>
      load("saleProducts"),

    loadSaleBills: (opts) =>
      load(
        "saleBills",
        opts
      ),

    loadPurchaseLines: () =>
      load(
        "purchaseLines"
      ),

    loadPurchaseReturns: (
      opts
    ) =>
      load(
        "purchaseReturns",
        opts
      ),

    loadSaleReturns: (
      opts
    ) =>
      load(
        "saleReturns",
        opts
      ),

    loadCustomers: () =>
      load("customers"),

    loadAdvancePayments,

    loadStore,

    loadStockExpiryAlerts,

    invalidate,
  };

  return (
    <AppDataContext.Provider
      value={value}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData =
  () => useContext(
    AppDataContext
  );