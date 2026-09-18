import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link, useHistory } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const Staff = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [staffs, setStaffs] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null); // Holds { id, name, role }
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    password_confirmation: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/staff`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setStaffs(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching staffs:", error);
    }
  };

  const handleCreateStaff = () => {
    localStorage.setItem("staff_detail", null);
  };

  const handleEdit = (row) => {
    localStorage.setItem("staff_detail", JSON.stringify(row));
  };

  const handleOpenPasswordModal = (row) => {
    setTargetUser({ id: row.id, name: row.name, role: row.role });
    setPasswordForm({ password: "", password_confirmation: "" });
    setFormErrors({});
    setOpenPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/user/change-password`,
        {
          user_id: targetUser.id,
          password: passwordForm.password,
          password_confirmation: passwordForm.password_confirmation,
        },
        {
          headers: {
            Authorization: `Bearer ${user_data?.token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      toast.success(response.data.message || "Password updated successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      setOpenPasswordModal(false);
    } catch (error) {
      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors);

        toast.error("Validation failed. Please verify inputs.", {
          position: "top-right",
        });
      } else if (error.response?.status === 401) {
        toast.error("Unauthenticated. Please login again.", {
          position: "top-right",
        });
      } else if (error.response?.status === 403) {
        toast.error("Forbidden. You are not allowed to do this.", {
          position: "top-right",
        });
      } else {
        toast.error(error.response?.data?.message || "Something went wrong.", {
          position: "top-right",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this staff?")) {
      handleDelete(id);
    }
  };

  const handleDelete = async (id) => {
    const response = await axios.delete(`${BASE_URL}/api/staff/${id}`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    if (response) {
      history.push("/staff");
      toast.success("staff Deleted");
      fetchStaff();
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();
    const result = staffs.filter((item) => {
      const searchable = `
      ${item.id}
      ${item.store?.name}
      ${item.name}
      ${item.username}
      ${item.role}
    `.toLowerCase();
      return searchable.includes(searchText);
    });
    setFilteredData(result);
  }, [search, staffs]);

  const columns = [
    {
      name: "Id",
      selector: (row) => row.id,
      sortable: true,
      width: "100px",
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      width: "180px",
    },
    {
      name: "Username",
      selector: (row) => row.username,
      sortable: true,
      width: "180px",
    },
    {
      name: "Role",
      selector: (row) => row.role,
      sortable: true,
      width: "150px",
    },
    {
      name: "Branch",
      selector: (row) => row.store?.name || "N/A",
      sortable: true,
      width: "180px",
    },
    {
      name: "Action",
      cell: (row) => (
        <div
          className="list-icon-function"
          style={{ display: "flex", gap: "12px", alignItems: "center" }}
        >
          <div
            className="item key"
            style={{ cursor: "pointer", color: "#e0a800" }}
            onClick={() => handleOpenPasswordModal(row)}
          >
            <i className="icon-key" style={{ fontSize: "16px" }}></i>
          </div>

          <div className="item edit">
            <Link to={`/staff/edit/${row.id}`} onClick={() => handleEdit(row)}>
              <i className="icon-edit-3"></i>
            </Link>
          </div>

          <div
            className="item trash"
            style={{ cursor: "pointer" }}
            onClick={() => handleDeleteConfirm(row.id)}
          >
            <i className="icon-trash-2"></i>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>All Staff</h3>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">
                  <div className="text-tiny">Staff</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Staff</div>
              </li>
            </ul>
          </div>

          <div className="wg-box wg-content">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>

              {user_data?.user?.role?.toLowerCase().trim() !== "manager" && (
                <Link className="tf-button style-1 w208" to="/create-staff">
                  <i className="icon-plus"></i> Add new
                </Link>
              )}
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={{
                headCells: {
                  style: { fontWeight: "bold", fontSize: "14px" },
                },
              }}
            />
            <div className="divider"></div>
          </div>
        </div>
      </div>

      {openPasswordModal && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            background: "rgba(0,0,0,0.55)",
            zIndex: 1060,
          }}
          tabIndex="-1"
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-content p-2">
              <div className="modal-header border-0 pb-0">
                <div>
                  <h4 className="modal-title fw-bold text-4xl text-dark">
                    Reset Staff Password
                  </h4>
                  <p className="text-muted text-2xl mt-2 mb-0">
                    User:{" "}
                    <strong className="text-primary">{targetUser?.name}</strong>{" "}
                    ({targetUser?.role})
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close fs-5"
                  onClick={() => setOpenPasswordModal(false)}
                ></button>
              </div>
              <form onSubmit={handlePasswordSubmit}>
                <div className="modal-body text-left py-3">
                  {/* Password Input */}
                  <div className="form-group mb-4">
                    <label className="form-label fw-semibold text-2xl mt-2 mb-2 text-secondary">
                      New{" "}
                      {targetUser?.role === "cashier"
                        ? "4-Digit PIN"
                        : "Password"}
                    </label>
                    <input
                      type="password"
                      className={`form-control form-control-lg fs-5 ${formErrors.password ? "is-invalid border-danger" : "border-secondary-subtle"}`}
                      style={{ padding: "12px 16px", borderRadius: "8px" }}
                      name="password"
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          password: e.target.value,
                        })
                      }
                      placeholder={
                        targetUser?.role === "cashier"
                          ? "e.g. 1234"
                          : "Minimum 6 characters"
                      }
                      required
                    />
                    {formErrors.password && (
                      <div className="text-danger fw-medium fs-6 mt-1">
                        {formErrors.password[0]}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Input */}
                  <div className="form-group mb-3">
                    <label className="form-label fw-semibold text-2xl mt-2 mb-2 text-secondary">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg fs-5 border-secondary-subtle"
                      style={{ padding: "12px 16px", borderRadius: "8px" }}
                      name="password_confirmation"
                      placeholder="Re-enter password"
                      value={passwordForm.password_confirmation}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          password_confirmation: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 pt-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-light fs-5 px-4 py-2"
                    style={{ borderRadius: "8px" }}
                    onClick={() => setOpenPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fs-5 px-4 py-2 fw-semibold"
                    style={{ borderRadius: "8px" }}
                    disabled={
                      isSubmitting ||
                      !passwordForm.password.trim() ||
                      !passwordForm.password_confirmation.trim()
                    }
                  >
                    {isSubmitting ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
export default Staff;
