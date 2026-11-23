import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
axios.defaults.baseURL = BASE_URL;

axios.interceptors.request.use((config) => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || "");
    const isLoginCall = requestUrl.endsWith("/api/login");

    if (
      error.response &&
      error.response.status === 401 &&
      !isLoginCall
    ) {
      localStorage.removeItem("user_detail");
      localStorage.removeItem("cart_detail");
      toast.error("Session Expired. Please login again.");
      window.location.href = "/";
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export default axios;
