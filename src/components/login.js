import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import ForgotPasswordModal from "./ForgotPassword";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Login = () => {
  const history = useHistory();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // validation
  const validate = () => {
    let temp = {};

    if (!formData.username) temp.username = "Username is required";
    if (!formData.password) temp.password = "Password is required";

    setErrors(temp);

    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      console.log("Validation failed");
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/login`, formData, {
        headers: {
          accept: "application/json",
        },
      });
      const user_detail = response.data;
      localStorage.setItem("user_detail", JSON.stringify(user_detail));
      if (response.data) {
        toast.success(user_detail.message || "Login successfull!");
        history.push("/dashboard");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid credentials!");
      console.error("LOGIN ERROR:", err);
    }
  };

  return (
    <div className="wrap-login-page">
      <div className="flex-grow flex flex-column justify-center gap30">
        <div className="login-box">
          <h3>Login to account</h3>
          <form
            className="form-login flex flex-column gap24"
            onSubmit={handleSubmit}
          >
            {/* Username */}
            <fieldset className="username">
              <div className="body-title mb-10">
                Username <span className="tf-color-1">*</span>
              </div>
              <input
                type="text"
                placeholder="Enter your username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />
              {errors.username && (
                <small className="text-red-600 text-xl">
                  {errors.username}
                </small>
              )}
            </fieldset>

            {/* Password */}
            <fieldset className="password">
              <div className="body-title mb-10">
                Password <span className="tf-color-1">*</span>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <small className="text-red-600 text-xl">
                  {errors.password}
                </small>
              )}
            </fieldset>
            <button type="submit" className="tf-button w-full text-white">
              Login
            </button>
            {/* <div className="body-text text-center">
              Do not have account? please Login here
              <Link to="/register" className="body-text tf-color">
                {" "}
                Register Now{" "}
              </Link>
            </div> */}

            <div className="body-text text-center">
              Please Cashier Login here
              <Link to="/cashier_login" className="body-text tf-color">
                {" "}
                Cashier Login
              </Link>
            </div>
          </form>

          <div className="body-text text-center mt-3">
            Forgot Password?{" "}
            <a
              href="#forgot-password"
              className="body-text tf-color fw-semibold"
              onClick={(e) => {
                e.preventDefault();
                setShowForgotModal(true);
              }}
              style={{ cursor: "pointer" }}
            >
              Reset here
            </a>
          </div>

          {showForgotModal && (
            <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
          )}
        </div>
      </div>
    </div>
  );
};
export default Login;
