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
    name: Yup.string().required("Name is required"),
    username: Yup.string().required("Username is required"),
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
                  {/* Name */}
                  <div className="row mb-15">
                    <fieldset className="col-md-5">
                      <div className="body-title">Name *</div>
                      <div className="body-content mb-15">
                        <Field
                          type="text"
                          name="name"
                          className="mb-5"
                          placeholder="Enter staff name"
                        />
                        <ErrorMessage
                          name="name"
                          component="div"
                          className="error-text"
                        />
                      </div>
                    </fieldset>

                    {/* Username */}
                    <fieldset className="col-md-5">
                      <div className="body-title">Username *</div>
                      <div className="body-content">
                        <Field
                          type="text"
                          name="username"
                          className="mb-5"
                          placeholder="Enter username"
                        />
                        <ErrorMessage
                          name="username"
                          component="div"
                          className="error-text"
                        />
                      </div>
                    </fieldset>
                  </div>
                  <div className="row mb-15">
                    <fieldset className="col-md-5">
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
                    <fieldset className="col-md-5">
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
                  </div>
                  {values.role === "cashier" && !isEdit && (
                    <fieldset className="col-md-5">
                      <div className="body-title">Pin *</div>
                      <div className="body-content mb-15">
                        <Field
                          type="text"
                          name="pin"
                          maxLength={4}
                          className="mb-5"
                        />
                        <ErrorMessage
                          name="pin"
                          component="div"
                          className="error-text"
                        />
                      </div>
                    </fieldset>
                  )}

                  {values.role === "manager" && (
                    <div className="row mb-15">
                      <fieldset className="col-md-10">
                        <div className="body-title">Features *</div>
                        <div
                          className="body-content mb-15"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "12px",
                          }}
                        >
                          {Object.entries(featureCatalog).map(([key, info]) => (
                            <label
                              key={key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={values.features.includes(key)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...values.features, key]
                                    : values.features.filter((f) => f !== key);
                                  setFieldValue("features", next);
                                }}
                              />
                              {info.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <div className="flex">
                    <button className="tf-button w208" type="submit">
                      {isEdit ? "Update Staff" : "Create Staff"}
                    </button>
                    <button type="button" className="ml-5">
                      <a href="/staff"> Cancel</a>
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
