import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import ForgotPasswordModal from "./ForgotPassword";
import "../assets/css/login.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const POS_LOGIN_IMAGE = "../../assets/images/avatar/pos.png";
const VAKARO_LOGO = "../../assets/images/avatar/logo.png";

const Login = () => {
  const navigate = useNavigate();

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

    setErrors({
      ...errors,
      [e.target.name]: "",
    });
  };

  const validate = () => {
    const temp = {};

    if (!formData.username) {
      temp.username = "Username is required";
    }

    if (!formData.password) {
      temp.password = "Password is required";
    }

    setErrors(temp);

    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const response = await axios.post(
        `${BASE_URL}/api/login`,
        formData,
        {
          headers: {
            accept: "application/json",
          },
        },
      );

      const user_detail = response.data;

      localStorage.setItem(
        "user_detail",
        JSON.stringify(user_detail),
      );

      if (response.data) {
        toast.success(
          user_detail.message || "Login successful!",
        );

        if (user_detail.must_change_credentials) {
          navigate("/change-password");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Invalid credentials!",
      );

      console.error("LOGIN ERROR:", err);
    }
  };

  return (
    <main className="vakaro-login-page">
      {/* LEFT SIDE IMAGE PANEL */}
      <section className="vakaro-login-visual">
        <div className="vakaro-visual-content">
          <div className="vakaro-eyebrow">
            Your business
          </div>

          <p className="vakaro-visual-description">
            See sales, stock, payments, customers and business
            performance from one connected POS dashboard.
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
          Know what&apos;s happening.
          <strong>Act with confidence.</strong>
        </div>
      </section>

      {/* RIGHT SIDE LOGIN FORM */}
      <section className="vakaro-login-form-side">
        <div className="vakaro-login-card">
          <img
            className="vakaro-form-logo"
            src={VAKARO_LOGO}
            alt="Vakaro"
          />

          <p className="vakaro-form-eyebrow">
            Welcome to Vakaro
          </p>

          <h2>Login to your account</h2>

          <p className="vakaro-form-subtitle">
            Enter your details to continue to the store dashboard.
          </p>

          <form
            className="vakaro-form-login"
            onSubmit={handleSubmit}
          >
            <fieldset className="vakaro-field">
              <label htmlFor="username">
                Username{" "}
                <span className="vakaro-required">*</span>
              </label>

              <input
                id="username"
                className="vakaro-input"
                type="text"
                placeholder="Enter your username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />

              {errors.username && (
                <small className="vakaro-error">
                  {errors.username}
                </small>
              )}
            </fieldset>

            <fieldset className="vakaro-field">
              <label htmlFor="password">
                Password{" "}
                <span className="vakaro-required">*</span>
              </label>

              <input
                id="password"
                className="vakaro-input"
                type="password"
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />

              {errors.password && (
                <small className="vakaro-error">
                  {errors.password}
                </small>
              )}
            </fieldset>

            <button
              type="submit"
              className="vakaro-submit"
            >
              Login to POS{" "}
              <span aria-hidden="true">→</span>
            </button>

            <p className="vakaro-cashier-text">
              Please Cashier Login here{" "}
              <Link
                to="/cashier_login"
                className="vakaro-cashier-link"
              >
                Cashier Login
              </Link>
            </p>
          </form>

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
            <ForgotPasswordModal
              onClose={() => setShowForgotModal(false)}
            />
          )}
        </div>
      </section>
    </main>
  );
};

export default Login;