import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import useStockExpiryAlerts from "../hooks/useStockExpiryAlerts";
import ExpiryAlertBadge from "./ExpiryAlertBadge";
import ExpiryAlertModal from "./ExpiryAlertModal";
import axios from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Header = () => {
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const [showMenu, setShowMenu] = useState(false);
  const history = useHistory();

  const { alerts, total: alertTotal, loading } = useStockExpiryAlerts();
  const [openExpiryModal, setOpenExpiryModal] = useState(false);

  // Change Password State Management
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SweetAlert2 Toaster Mixin Configuration
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const handleInputChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/user/change-password`,
        passwordForm,
        {
          headers: {
            Authorization: `Bearer ${user_data?.token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      toast.success(response.data.message || "Password changed successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });

      setOpenPasswordModal(false);
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setFormErrors(error.response.data.errors);

        toast.error("Validation failed. Please check the form.", {
          position: "top-right",
        });
      } else {
        toast.error("Something went wrong. Please try again later.", {
          position: "top-right",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const user_detail = localStorage.getItem("user_detail");
      const user = user_detail ? JSON.parse(user_detail) : null;

      await axios.post(
        `${BASE_URL}/api/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            Accept: "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Logout API error:", error);
    }

    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
    });

    localStorage.clear();
    sessionStorage.clear();
    history.push("/");
  };

  return (
    <div className="header-dashboard">
      <div className="wrap">
        <div className="header-left">
          <Link to="/">
            <img
              className=""
              id="logo_header_mobile"
              alt=""
              src="images/logo/logo.jpg"
              data-light="images/logo/logo.jpg"
              data-dark="images/logo/logo-dark.png"
              data-width="154px"
              data-height="52px"
              data-retina="images/logo/logo@2x.png"
            />
          </Link>
          <div className="button-show-hide">
            <i className="icon-menu-left"></i>
          </div>
        </div>

        <div className="header-grid">
          {user_data?.user?.role !== "superadmin" && (
            <>
              <ExpiryAlertBadge
                total={alertTotal}
                onClick={() => setOpenExpiryModal(true)}
              />
              <ExpiryAlertModal
                open={openExpiryModal}
                onClose={() => setOpenExpiryModal(false)}
                alerts={alerts}
              />
            </>
          )}
          <div className="popup-wrap user type-header">
            <div className="dropdown">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="dropdownMenuButton3"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                onClick={toggleMenu}
              >
                <span className="header-user wg-user flex items-center justify-end gap-3 mr-10">
                  <span className="image">
                    <img src="images/avatar/user-1.png" alt="" />
                  </span>

                  <span className="flex flex-col items-end text-left">
                    <span className="body-title mb-1">
                      {user_data?.user?.name}
                    </span>
                    <span className="text-tiny">{user_data?.user?.role}</span>
                  </span>
                </span>
              </button>
              <ul
                className={
                  showMenu
                    ? "dropdown-menu-home dropdown-menu-end has-content"
                    : "dropdown-menu-bar dropdown-menu-end has-content"
                }
                aria-labelledby="dropdownMenuButton3"
              >
                <li>
                  <Link
                    to="#"
                    className="user-item"
                    onClick={() => {
                      setOpenPasswordModal(true);
                      setShowMenu(false);
                    }}
                  >
                    <div className="icon">
                      <i className="icon-lock"></i>
                    </div>
                    <span className="body-title-2">Change Password</span>
                  </Link>
                </li>

                <li>
                  <Link to="#" className="user-item" onClick={handleLogout}>
                    <div className="icon">
                      <i className="icon-power"></i>
                    </div>
                    <span className="body-title-2">Logout</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {openPasswordModal && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.55)" }}
          tabIndex="-1"
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-content p-2">
              <div className="modal-header border-0 pb-0">
                <h4 className="modal-title text-4xl text-dark mb-4">
                  Update Your Password
                </h4>
                <button
                  type="button"
                  className="btn-close fs-5"
                  onClick={() => {
                    setOpenPasswordModal(false);
                    setFormErrors({});
                  }}
                ></button>
              </div>
              <form onSubmit={handlePasswordSubmit}>
                <div className="modal-body text-left py-3">
                  {/* Current Password */}
                  <div className="form-group mb-4">
                    <label className="form-label text-3xl mb-2 text-secondary mt-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      className={`form-control form-control-lg fs-5 ${formErrors.current_password ? "is-invalid border-danger" : "border-secondary-subtle"}`}
                      style={{ padding: "12px 16px", borderRadius: "8px" }}
                      name="current_password"
                      placeholder="Enter current password"
                      value={passwordForm.current_password}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.current_password && (
                      <div className="text-danger fw-medium fs-6 mt-1">
                        {formErrors.current_password[0]}
                      </div>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="form-group mb-4">
                    <label className="form-label text-3xl mb-2 text-secondary mt-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      className={`form-control form-control-lg fs-5 ${formErrors.password ? "is-invalid border-danger" : "border-secondary-subtle"}`}
                      style={{ padding: "12px 16px", borderRadius: "8px" }}
                      name="password"
                      placeholder="Enter new password"
                      value={passwordForm.password}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.password && (
                      <div className="text-danger fw-medium fs-6 mt-1">
                        {formErrors.password[0]}
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="form-group mb-3">
                    <label className="form-label text-3xl mb-2 text-secondary mt-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg fs-5 border-secondary-subtle"
                      style={{ padding: "12px 16px", borderRadius: "8px" }}
                      name="password_confirmation"
                      placeholder="Re-enter new password"
                      value={passwordForm.password_confirmation}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 pt-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-light fs-5 px-4 py-2"
                    style={{ borderRadius: "8px" }}
                    onClick={() => {
                      setOpenPasswordModal(false);
                      setFormErrors({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fs-5 px-4 py-2 fw-semibold"
                    style={{ borderRadius: "8px" }}
                    disabled={
                      isSubmitting ||
                      !passwordForm.current_password.trim() ||
                      !passwordForm.password.trim() ||
                      !passwordForm.password_confirmation.trim()
                    }
                  >
                    {isSubmitting ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Header;
