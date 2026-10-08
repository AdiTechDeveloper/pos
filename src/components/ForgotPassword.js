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
      style={{
        display: "block",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(5px)",
        zIndex: 1060,
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered px-3"
        style={{ maxWidth: "520px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">

          <div className="modal-header border-bottom px-4 px-md-5 pt-4 pb-3">
            <div>
              <h4 className="fw-bold text-dark mb-2">
                Account Recovery
              </h4>

              <p className="text-muted text-xl mb-0 small">
                Verify your identity to reset your account password.
              </p>
            </div>

            <button
              type="button"
              className="btn-close shadow-none ms-3"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          <form onSubmit={handleSubmit}>

            <div className="modal-body px-4 px-md-5 py-4">

              {/* USERNAME */}
              <div className="mb-4">
                <label className="form-label text-xl text-dark mb-4">
                  Username
                </label>

                <input
                  type="text"
                  placeholder="Enter your username"
                  className={`form-control form-control-lg ${errors.admin_username ? "is-invalid" : ""
                    }`}
                  value={formData.admin_username}
                  onChange={(e) =>
                    handleChange("admin_username", e.target.value)
                  }
                />

                {errors.admin_username && (
                  <div className="invalid-feedback mt-1">
                    {errors.admin_username}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label text-xl text-dark mb-4">
                  Recovery PIN
                </label>

                <input
                  type="password"
                  placeholder="Enter 6-digit PIN"
                  maxLength={6}
                  inputMode="numeric"
                  className={`form-control form-control-lg ${errors.master_key ? "is-invalid" : ""
                    }`}
                  value={formData.master_key}
                  onChange={(e) =>
                    handleChange(
                      "master_key",
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                />

                {errors.master_key && (
                  <div className="invalid-feedback mt-1">
                    {errors.master_key}
                  </div>
                )}

                <div className="form-text text-xl mt-2 text-muted">
                  Enter your 6-digit master recovery PIN code.
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 my-4">
                <hr className="flex-grow-1 m-0 opacity-25" />

                <span className="text-muted text-xl fw-semibold text-nowrap">
                  New Credentials
                </span>

                <hr className="flex-grow-1 m-0 opacity-25" />
              </div>

              <div className="mb-4 ">
                <label className="form-label text-xl text-dark mb-4">
                  New Password
                </label>

                <input
                  type="password"
                  placeholder="Enter new password"
                  className={`form-control form-control-lg ${errors.new_password ? "is-invalid" : ""
                    }`}
                  value={formData.new_password}
                  onChange={(e) =>
                    handleChange("new_password", e.target.value)
                  }
                />

                {errors.new_password && (
                  <div className="invalid-feedback mt-1">
                    {errors.new_password}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <label className="form-label text-xl text-dark mb-4">
                  Confirm Password
                </label>

                <input
                  type="password"
                  placeholder="Re-enter new password"
                  className={`form-control form-control-lg ${errors.new_password_confirmation
                      ? "is-invalid"
                      : ""
                    }`}
                  value={formData.new_password_confirmation}
                  onChange={(e) =>
                    handleChange(
                      "new_password_confirmation",
                      e.target.value
                    )
                  }
                />

                {errors.new_password_confirmation && (
                  <div className="invalid-feedback mt-1">
                    {errors.new_password_confirmation}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-top px-4 px-md-5 py-3 bg-light">

              <button
                type="button"
                className="btn btn-light border text-xl px-4 py-2 fw-semibold"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary text-xl px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}

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
