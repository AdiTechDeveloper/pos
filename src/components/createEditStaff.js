import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";

const CreateEditStaff = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams(); // if id exists -> Edit Mode
  const history = useHistory();
  const [featureCatalog, setFeatureCatalog] = useState({});
  const featureKeys = Object.keys(featureCatalog);

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_staff = localStorage.getItem("staff_detail");

  const incomingStaff = store_staff && JSON.parse(store_staff);
  const isEdit = Boolean(id);
  const appData = useAppData();
  const branches = appData?.branches || [];
  const [initialValues, setInitialValues] = useState({
    name: "",
    username: "",
    role: "",
    pin: "",
    branch_ids: [],
    features: [],
  });

  const cleanedBranchIds =
    incomingStaff?.branches?.map((b) => b.pivot.branch_id) || [];

  // If editing → set initial values
  const loadStaffData = () => {
    if (incomingStaff) {
      setInitialValues({
        name: incomingStaff.name,
        username: incomingStaff.username,
        role: incomingStaff.role,
        pin: incomingStaff.pin,
        branch_ids: isEdit ? cleanedBranchIds : [],
        features: [],
      });

      if (isEdit && incomingStaff.role === "manager") {
        axios
          .get(`${BASE_URL}/api/staff/${id}/features`, {
            headers: { Authorization: `Bearer ${user_data.token}` },
          })
          .then((res) => {
            setInitialValues((prev) => ({
              ...prev,
              features: res.data.data || [],
            }));
            setFeatureCatalog((prev) =>
              Object.keys(prev).length ? prev : prev,
            );
          });
      }
    }
  };

  useEffect(() => {
    loadStaffData();
    appData?.loadBranches();

    axios
      .get(`${BASE_URL}/api/features`, {
        headers: { Authorization: `Bearer ${user_data.token}` },
      })
      .then((res) => setFeatureCatalog(res.data.data || {}));
  }, []);

  // Validation Schema
  const validationSchema = Yup.object({
   name: Yup.string()
        .required("Name is required")
        .min(3, "Name must be at least 3 characters") // Changed from 2 to 3 to catch 2-letter names
        .max(30, "Name cannot exceed 30 characters"),
     username: Yup.string()
        .required("Username is required")
        .min(3, "Name must be at least 3 characters") // Changed from 2 to 3 to catch 2-letter names
        .max(30, "Name cannot exceed 30 characters"),
    
    role: Yup.string().required("Role is required"),
    branch_ids: Yup.array()
      .min(1, "At least one branch is required")
      .required("Branch is required"),
  });

  

  // Submit (Create + Update)
  const handleSubmit = async (values, actions) => {
    try {
      let url = "";
      let method = "";
      if (isEdit) {
        // UPDATE PRODUCT
        url = `${BASE_URL}/api/staff/${id}`;
        method = "put";
      } else {
        // CREATE PRODUCT
        url = `${BASE_URL}/api/staff`;
        method = "post";
      }

      await axios({
        method,
        url,
        data: values,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      toast.success(
        isEdit ? "Staff updated successfully!" : "Staff created successfully!",
      );
      actions.resetForm();
      history.push("/staff");
    } catch (error) {
      if (error.response && error.response.data) {
        const apiMessage =
          error.response.data.message || "An unexpected error occurred.";

        toast.error(apiMessage);
        if (error.response.data.errors) {
          actions.setErrors(error.response.data.errors);
        }
      } else {
        console.error("Error saving staff:", error);
        toast.error("Network error. Please check your connection.");
      }
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-8">{isEdit ? "Edit Staff" : "Create Staff"}</h3>

          <div className="wg-box">
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => handleSubmit(values, actions)}
            >
              {({ values, setFieldValue }) => (
                <Form className="wg-form">
                  {/* Single Row Container for All Fields */}
                  <div className="row mb-15 align-items-start">
                    {/* Name */}
                    <fieldset
                      className={`col-12 ${values.role === "cashier" && !isEdit ? "col-md-2" : "col-md-3"}`}
                    >
                      <div className="body-title">Name *</div>
                      <div className="body-content mb-15">
                        <Field type="text" name="name" className="mb-5" placeholder="Enter staff name"  maxLength={30}  />
                        <ErrorMessage name="name" component="div" className="error-text" />
                      </div>
                    </fieldset>

                    {/* Username */}
                    <fieldset
                      className={`col-12 ${values.role === "cashier" && !isEdit ? "col-md-2" : "col-md-3"}`}
                    >
                      <div className="body-title">Username *</div>
                      <div className="body-content">
                        <Field type="text" name="username" className="mb-5" placeholder="Enter username"  maxLength={30}   />
                        <ErrorMessage name="username" component="div" className="error-text" />
                      </div>
                    </fieldset>

                    {/* Branch IDs */}
                    <fieldset
                      className={`col-12 ${values.role === "cashier" && !isEdit ? "col-md-2" : "col-md-3"}`}
                    >
                      <div className="body-title">Branch IDs *</div>
                      <div className="body-content mb-15">
                        <Field
                          as="select"
                          name="branch_ids"
                          className="mb-5"
                          value={values.branch_ids.map(String)}
                          onChange={(e) => {
                            const selected = Array.from(
                              e.target.selectedOptions,
                              (option) => Number(option.value),
                            );
                            setFieldValue("branch_ids", selected);
                          }}
                        >
                          <option value="" disabled>
                            Select branch
                          </option>
                          {branches.map((element) => (
                            <option
                              key={element.id}
                              value={element.id}
                              className={
                                values.branch_ids.includes(Number(element.id))
                                  ? "selected-branch-style"
                                  : "branch-style"
                              }
                            >
                              {element.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="branch_ids"
                          component="div"
                          className="error-text"
                        />
                      </div>
                    </fieldset>

                    {/* Role */}
                    <fieldset
                      className={`col-12 ${values.role === "cashier" && !isEdit ? "col-md-3" : "col-md-3"}`}
                    >
                      <div className="body-title">Role *</div>
                      <div className="body-content">
                        <Field as="select" name="role" className="mb-5">
                          <option value="">Select Role</option>
                          <option value="manager">Manager</option>
                          <option value="cashier">Cashier</option>
                        </Field>
                        <ErrorMessage
                          name="role"
                          component="div"
                          className="error-text"
                        />
                      </div>
                    </fieldset>

                    {/* Pin (Conditionally rendered in the same row) */}
                    {values.role === "cashier" && !isEdit && (
                      <fieldset className="col-12 col-md-3">
                        <div className="body-title">Pin *</div>
                        <div className="body-content mb-15">
                          <Field
                            type="text"
                            name="pin"
                            maxLength={4}
                            className="mb-5"
                            placeholder="4-digit PIN"
                          />
                          <ErrorMessage
                            name="pin"
                            component="div"
                            className="error-text"
                          />
                        </div>
                      </fieldset>
                    )}
                  </div>

                  {values.role === "manager" && (
                    <div className="row mb-15">
                      <fieldset className="col-md-10">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                            marginBottom: "14px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            className="body-title"
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              fontSize: "16px",
                              color: "#1f2937",
                            }}
                          >
                            Features *
                            <span
                              style={{
                                marginLeft: "8px",
                                padding: "3px 9px",
                                borderRadius: "999px",
                                backgroundColor: "#f1f5f9",
                                color: "#64748b",
                                fontSize: "12px",
                                fontWeight: 500,
                              }}
                            >
                              {values.features.length} of {featureKeys.length}{" "}
                              selected
                            </span>
                          </div>

                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              backgroundColor:
                                featureKeys.length > 0 &&
                                featureKeys.every((key) =>
                                  values.features.includes(key),
                                )
                                  ? "#dbeafe"
                                  : "#f8fafc",
                              color: "#1d4ed8",
                              cursor: featureKeys.length
                                ? "pointer"
                                : "not-allowed",
                              fontSize: "13px",
                              fontWeight: 600,
                              opacity: featureKeys.length ? 1 : 0.6,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                featureKeys.length > 0 &&
                                featureKeys.every((key) =>
                                  values.features.includes(key),
                                )
                              }
                              onChange={(e) =>
                                setFieldValue(
                                  "features",
                                  e.target.checked ? featureKeys : [],
                                )
                              }
                              disabled={!featureKeys.length}
                              style={{
                                width: "16px",
                                height: "16px",
                                accentColor: "#2563eb",
                                cursor: featureKeys.length
                                  ? "pointer"
                                  : "not-allowed",
                              }}
                            />
                            Select all
                          </label>
                        </div>

                        <div
                          className="body-content mb-15"
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(160px, 1fr))",
                            gap: "14px",
                          }}
                        >
                          {Object.entries(featureCatalog).map(([key, info]) => {
                            const isSelected = values.features.includes(key);

                            return (
                              <label
                                key={key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "13px 14px",
                                  borderRadius: "6px",
                                  border: isSelected
                                    ? "1px solid #60a5fa"
                                    : "1px solid #e2e8f0",
                                  backgroundColor: isSelected
                                    ? "#eff6ff"
                                    : "#ffffff",
                                  color: isSelected ? "#1d4ed8" : "#374151",
                                  cursor: "pointer",
                                  fontWeight: isSelected ? 600 : 400,
                                  transition: "all 0.2s ease",
                                  boxShadow: isSelected
                                    ? "0 4px 10px rgba(37, 99, 235, 0.12)"
                                    : "0 2px 5px rgba(15, 23, 42, 0.05)",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...values.features, key]
                                      : values.features.filter(
                                          (f) => f !== key,
                                        );
                                    setFieldValue("features", next);
                                  }}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    accentColor: "#3b82f6",
                                    cursor: "pointer",
                                  }}
                                />
                                {info.icon && <span>{info.icon}</span>}
                                <span style={{ fontSize: "14px" }}>
                                  {info.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <div className="flex">
                    <button className="tf-button w208" type="submit">
                      {isEdit ? "Update Satff" : "Create Staff"}
                    </button>
                    <button type="button" className="ml-5 tf-button style-1">
                      <a
                        href="/staff"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        Cancel
                      </a>
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditStaff;
