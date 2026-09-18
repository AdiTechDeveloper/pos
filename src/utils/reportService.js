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

export const fetchProfitLoss = async (params = {}) => {
  const response = await axios.get(`${BASE_URL}/api/reports/profit-loss`, {
    headers: getAuthHeader(),
    params: params,
  });

  return response.data;
};

export const topSellingProducts = async (params = {}) => {
  const response = await axios.get(
    `${BASE_URL}/api/reports/top-selling-products`,
    {
      headers: getAuthHeader(),
      params: params,
    },
  );

  return response.data;
};

export const fetchLowStockProducts = async (params = {}) => {
  const response = await axios.get(`${BASE_URL}/api/stock-alerts`, {
    headers: getAuthHeader(),
    params: params,
  });

  return response.data;
};
