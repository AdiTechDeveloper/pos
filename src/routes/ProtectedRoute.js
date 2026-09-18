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
  if (role === "cashier" && rest.path !== "/pos") {
    return <Redirect to="/pos" />;
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
