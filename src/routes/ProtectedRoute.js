import React from "react";
import { Route, Redirect } from "react-router-dom";

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const storedData = localStorage.getItem("user_detail");
  const userDetail = storedData ? JSON.parse(storedData) : null;
  const role = userDetail?.user?.role;

  const token = userDetail?.token;
  if (!token) {
    return <Redirect to="/" />;
  }

  if (userDetail?.must_change_credentials && rest.path !== "/change-password") {
    return <Redirect to="/change-password" />;
  }

  if (
    role === "cashier" &&
    rest.path !== "/pos" &&
    rest.path !== "/change-password"
  ) {
    return <Redirect to="/pos" />;
  }

  const userFeatures = userDetail?.user?.features || [];
  if (
    rest.requiredFeature &&
    role !== "superadmin" &&
    !userFeatures.includes(rest.requiredFeature)
  ) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Route
      {...rest}
      render={(props) =>
        token ? <Component {...props} /> : <Redirect to="/" />
      }
    />
  );
};

export default ProtectedRoute;
