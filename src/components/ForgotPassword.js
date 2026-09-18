import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ForgotPasswordModal = ({ onClose }) => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    admin_username: "",
    master_key: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    let newErrors = {};

    if (!formData.admin_username.trim()) {
      newErrors.admin_username = "Username is required";
    }

    if (!formData.master_key.trim()) {
      newErrors.master_key = "Recovery PIN is required";
    } else if (!/^\d{6}$/.test(formData.master_key)) {
      newErrors.master_key = "PIN must be exactly 6 digits";
    }

    if (!formData.new_password) {
      newErrors.new_password = "Password is required";
    } else if (formData.new_password.length < 6) {
      newErrors.new_password = "Password must be at least 6 characters";
    }

    if (!formData.new_password_confirmation) {
      newErrors.new_password_confirmation = "Confirm your password";
    } else if (formData.new_password !== formData.new_password_confirmation) {
      newErrors.new_password_confirmation = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validate()) return;

    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/emergency-system-override`,
        formData,
      );

      toast.success(response.data.message || "Password reset successful");
      onClose();
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;

      let displayError = backendMessage || "Something went wrong. Try again.";

      if (validationErrors) {
        displayError = Object.values(validationErrors).flat().join(" ");
      }

      toast.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.6)", zIndex: 1060 }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: "450px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content p-3 border-0 rounded-4 shadow">
          <div className="modal-header border-0">
            <h4 className="fw-bold">Account Recovery</h4>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Username */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Username"
                  className={`form-control ${errors.admin_username ? "is-invalid" : ""}`}
                  value={formData.admin_username}
                  onChange={(e) =>
                    handleChange("admin_username", e.target.value)
                  }
                />
                {errors.admin_username && (
                  <div className="invalid-feedback">
                    {errors.admin_username}
                  </div>
                )}
              </div>

              {/* PIN */}
              <div className="mb-3 mt-6">
                <input
                  type="password"
                  placeholder="6-digit Recovery PIN"
                  maxLength={6}
                  inputMode="numeric"
                  className={`form-control ${errors.master_key ? "is-invalid" : ""}`}
                  value={formData.master_key}
                  onChange={(e) =>
                    handleChange(
                      "master_key",
                      e.target.value.replace(/\D/g, ""),
                    )
                  }
                />
                {errors.master_key && (
                  <div className="invalid-feedback">{errors.master_key}</div>
                )}
              </div>

              {/* New Password */}
              <div className="mb-3 mt-6">
                <input
                  type="password"
                  placeholder="New Password"
                  className={`form-control ${errors.new_password ? "is-invalid" : ""}`}
                  value={formData.new_password}
                  onChange={(e) => handleChange("new_password", e.target.value)}
                />
                {errors.new_password && (
                  <div className="invalid-feedback">{errors.new_password}</div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-3 mt-6">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  className={`form-control ${
                    errors.new_password_confirmation ? "is-invalid" : ""
                  }`}
                  value={formData.new_password_confirmation}
                  onChange={(e) =>
                    handleChange("new_password_confirmation", e.target.value)
                  }
                />
                {errors.new_password_confirmation && (
                  <div className="invalid-feedback">
                    {errors.new_password_confirmation}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-0">
              <button
                type="button"
                className="btn btn-light btn-lg text-2xl"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-lg text-2xl"
                disabled={loading}
              >
                {loading ? "Processing..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
