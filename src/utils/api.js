import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;

  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : {};
};

export const getProducts = (params = {}) =>
  axios.get(`${BASE_URL}/api/products`, {
    headers: getAuthHeader(),
    params: params,
  });

export const getCategories = () =>
  axios.get(`${BASE_URL}/api/categories`, { headers: getAuthHeader() });
export const getBrands = () =>
  axios.get(`${BASE_URL}/api/brands`, { headers: getAuthHeader() });

export const scanBarcode = (barcode) =>
  axios.post(
    `${BASE_URL}/api/sales/scan`,
    { barcode },
    { headers: getAuthHeader() },
  );

const generateIdempotencyKey = () =>
  "idemp_" +
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const createSalesBill = async (payload) => {
  const body = Array.isArray(payload) ? { lines: payload } : payload;

  let key = localStorage.getItem("store_idemp_key");
  if (!key) {
    key = generateIdempotencyKey();
    localStorage.setItem("store_idemp_key", key);
  }

  try {
    const res = await axios.post(`${BASE_URL}/api/sales-bills`, body, {
      headers: {
        ...getAuthHeader(),
        "Idempotency-Key": key,
      },
    });

    return res;
  } finally {
    localStorage.removeItem("store_idemp_key");
  }
};

export const fetchProfitLoss = (params = {}) =>
  axios.get(`${BASE_URL}/api/profit-loss`, {
    headers: getAuthHeader(),
    params: params,
  });

export const paySalesBill = async (sales_bill_id, payments) => {
  let key = localStorage.getItem("pay_idemp_key");
  if (!key) {
    key = generateIdempotencyKey();
    localStorage.setItem("pay_idemp_key", key);
  }

  const res = await axios.post(
    `${BASE_URL}/api/sales-bills/pay`,
    { sales_bill_id, payments },
    {
      headers: {
        ...getAuthHeader(),
        "Idempotency-Key": key,
      },
    },
  );

  localStorage.removeItem("pay_idemp_key");

  return res;
};

export const addCustomerAdvance = (payload) =>
  axios.post(`${BASE_URL}/api/customers/advance`, payload, {
    headers: getAuthHeader(),
  });

export const getCustomerWalletBalance = (mobile) =>
  axios.get(`${BASE_URL}/api/customers/wallet-balance/${mobile}`, {
    headers: getAuthHeader(),
  });
