import React from "react";
import { Navigate } from "react-router-dom";

// /delivery sirf role = "delivery" wale user ke liye.
// Baaki log (admin / manager / cashier) apne apne home par bhej diye jaate hain.
// (Asli suraksha backend par hai: delivery token se POS ke baaki APIs 403 dete hain.)
const DeliveryRoute = ({ component: Component }) => {
  const storedData = localStorage.getItem("user_detail");
  const userDetail = storedData ? JSON.parse(storedData) : null;

  const token = userDetail?.token;
  const role = userDetail?.user?.role;

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (userDetail?.must_change_credentials) {
    return <Navigate to="/change-password" replace />;
  }

  if (role !== "delivery") {
    return <Navigate to={role === "cashier" ? "/pos" : "/dashboard"} replace />;
  }

  return <Component />;
};

export default DeliveryRoute;