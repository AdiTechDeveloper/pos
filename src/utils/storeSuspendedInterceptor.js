import axios from "axios";

let handling = false;

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error?.response?.data;
    const isLoginCall = String(error?.config?.url || "").endsWith("/api/login");

    if (
      error?.response?.status === 403 &&
      data?.code === "STORE_SUSPENDED" &&
      !isLoginCall &&
      !handling
    ) {
      handling = true;

      let role = null;
      try {
        role = JSON.parse(localStorage.getItem("user_detail"))?.user?.role;
      } catch (e) {}

      localStorage.removeItem("user_detail");
      localStorage.removeItem("cart_detail");
      sessionStorage.clear();
      localStorage.setItem("login_notice", data.message);

      window.location.href = role === "cashier" ? "/cashier_login" : "/login";
    }

    return Promise.reject(error);
  },
);
