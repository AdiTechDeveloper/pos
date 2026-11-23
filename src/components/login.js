import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import ForgotPasswordModal from "./ForgotPassword";
import "../assets/css/login.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const POS_LOGIN_IMAGE = "/assets/images/avatar/pos.png";
const VAKARO_LOGO = "/assets/images/avatar/logo.png";

const getErrorMessage = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    if (status >= 500) return "Server error. Please try again later.";

    return (
      data?.message ||
      (data?.errors && Object.values(data.errors).flat()[0]) ||
      "Invalid username or password!"
    );
  }

  if (error.request) {
    return "Cannot reach the server. Please check your internet connection.";
  }

  return "Something went wrong. Please try again.";
};

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const submittingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const temp = {};

    if (!formData.username.trim()) temp.username = "Username is required";
    if (!formData.password) temp.password = "Password is required";

    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submittingRef.current) return;
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/login`,
        {
          username: formData.username.trim(),
          password: formData.password,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const user_detail = response.data;

      if (!user_detail?.token) {
        toast.error(user_detail?.message || "Login failed. Please try again.", {
          toastId: "login-error",
        });
        return;
      }

      localStorage.setItem("user_detail", JSON.stringify(user_detail));
      // Extra key in case any guard/component reads "token" directly
      localStorage.setItem("token", user_detail.token);

      toast.success(user_detail.message || "Login successful!");

      if (user_detail.must_change_credentials) {
        navigate("/change-password", { replace: true });
      } else if (user_detail?.user?.role === "delivery") {
        navigate("/delivery", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      toast.error(getErrorMessage(error), { toastId: "login-error" });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="vakaro-login-page">
      {/* LEFT SIDE IMAGE PANEL */}
      <section className="vakaro-login-visual">
        <div className="vakaro-visual-content">
          <div className="vakaro-eyebrow">Your business</div>

          <p className="vakaro-visual-description">
            See sales, stock, payments, customers and business performance from
            one connected POS dashboard.
          </p>

          <div className="vakaro-image-frame">
            <img
              className="vakaro-login-image"
              src={POS_LOGIN_IMAGE}
              alt="Vakaro POS dashboard"
            />
          </div>
        </div>

        <div className="vakaro-visual-footer">
          <span className="vakaro-status-dot" />
          Know what's happening.
          <strong>Act with confidence.</strong>
        </div>
      </section>

      {/* LOGIN FORM */}
      <section className="vakaro-login-form-side">
        <div className="vakaro-login-card">
          <img className="vakaro-form-logo" src={VAKARO_LOGO} alt="Vakaro" />

          <p className="vakaro-form-eyebrow">Welcome to Vakaro</p>

          <h2>Login to your account</h2>

          <p className="vakaro-form-subtitle">
            Enter your details to continue to the store dashboard.
          </p>

          <form className="vakaro-form-login" onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <fieldset className="vakaro-field">
              <label htmlFor="username">
                Username <span className="vakaro-required">*</span>
              </label>

              <input
                id="username"
                className="vakaro-input"
                type="text"
                placeholder="Enter your username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
              />

              {errors.username && (
                <small className="vakaro-error">{errors.username}</small>
              )}
            </fieldset>

            {/* Password */}
            <fieldset className="vakaro-field">
              <label htmlFor="password">
                Password <span className="vakaro-required">*</span>
              </label>

              <input
                id="password"
                className="vakaro-input"
                type="password"
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
              />

              {errors.password && (
                <small className="vakaro-error">{errors.password}</small>
              )}
            </fieldset>

            {/* Submit */}
            <button type="submit" disabled={loading} className="vakaro-login-btn">
              {loading ? "Logging in..." : "Login to your account"}
            </button>

            {/* Cashier login */}
            <p className="vakaro-cashier-text">
              Please Cashier Login here{" "}
              <Link to="/cashier_login" className="vakaro-cashier-link">
                Cashier Login
              </Link>
            </p>
          </form>

          {/* Forgot password */}
          <p className="vakaro-forgot-text">
            Forgot Password?{" "}
            <a
              href="#forgot-password"
              className="vakaro-forgot-link"
              onClick={(e) => {
                e.preventDefault();
                setShowForgotModal(true);
              }}
            >
              Reset here
            </a>
          </p>

          <div className="vakaro-secure-note">
            <span aria-hidden="true">▣</span>
            Protected store access
          </div>

          {showForgotModal && (
            <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
          )}
        </div>
      </section>
    </main>
  );
};

export default Login;