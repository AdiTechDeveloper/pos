import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ChangePassword = () => {
  const history = useHistory();
  const [formData, setFormData] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    let temp = {};
    if (!formData.current_password)
      temp.current_password = "Current password is required";
    if (!formData.password) temp.password = "New password is required";
    else if (formData.password.length < 6)
      temp.password = "Password must be at least 6 characters";
    if (!formData.password_confirmation)
      temp.password_confirmation = "Confirm your new password";
    else if (formData.password !== formData.password_confirmation)
      temp.password_confirmation = "Passwords do not match";
    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/user/change-password`, formData, {
        headers: { accept: "application/json" },
      });

      const storedData = localStorage.getItem("user_detail");
      const userDetail = storedData ? JSON.parse(storedData) : null;
      if (userDetail) {
        userDetail.must_change_credentials = false;
        localStorage.setItem("user_detail", JSON.stringify(userDetail));
      }

      toast.success("Password changed successfully!");
      const role = userDetail?.user?.role;
      history.push(role === "cashier" ? "/pos" : "/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap-login-page">
      <div className="flex-grow flex flex-column justify-center gap30">
        <div className="login-box">
          <h3>Set a new password</h3>
          <p className="body-text mb-10">
            This is your first login. You must change your password before
            proceeding.
          </p>
          <form
            className="form-login flex flex-column gap24"
            onSubmit={handleSubmit}
          >
            <fieldset className="current_password">
              <div className="body-title mb-10">
                Current Password <span className="tf-color-1">*</span>
              </div>
              <input
                type="password"
                placeholder="Enter current (default) password"
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
              />
              {errors.current_password && (
                <small className="text-red-600 text-xl">
                  {errors.current_password}
                </small>
              )}
            </fieldset>

            <fieldset className="password">
              <div className="body-title mb-10">
                New Password <span className="tf-color-1">*</span>
              </div>
              <input
                type="password"
                placeholder="Enter new password"
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

            <fieldset className="password_confirmation">
              <div className="body-title mb-10">
                Confirm New Password <span className="tf-color-1">*</span>
              </div>
              <input
                type="password"
                placeholder="Re-enter new password"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
              />
              {errors.password_confirmation && (
                <small className="text-red-600 text-xl">
                  {errors.password_confirmation}
                </small>
              )}
            </fieldset>

            <button
              type="submit"
              className="tf-button w-full text-white"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
