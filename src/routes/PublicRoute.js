import { Route, Redirect } from "react-router-dom";

const PublicRoute = ({ component: Component, ...rest }) => {
  const getRedirectPath = () => {
    const storedData = localStorage.getItem("user_detail");
    const userDetail = storedData ? JSON.parse(storedData) : null;

    if (!userDetail?.token) return null;

    if (userDetail?.must_change_credentials) return "/change-password";

    return userDetail.user?.role === "cashier" ? "/pos" : "/dashboard";
  };
  const redirectPath = getRedirectPath();

  return (
    <Route
      {...rest}
      render={(props) =>
        redirectPath ? <Redirect to={redirectPath} /> : <Component {...props} />
      }
    />
  );
};

export default PublicRoute;
