import React, { useEffect, useState } from "react";
import Layout from "./layout";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const CreateStore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [featureCatalog, setFeatureCatalog] = useState({});
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  const [editingData, setEditingData] = useState(
    location.state?.storeData || null,
  );
  const [loading, setLoading] = useState(isEdit && !location.state?.storeData);

  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchStore = async () => {
    const user_data = JSON.parse(localStorage.getItem("user_detail"));

    try {
      const res = await axios.get(`${BASE_URL}/api/stores/${id}`, {
        headers: {
          Authorization: `Bearer ${user_data?.token}`,
        },
      });
      console.log(res.data.data);
      setEditingData(res.data.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load store details.",
      );
      navigate("/store");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user_data = JSON.parse(localStorage.getItem("user_detail"));
    axios
      .get(`${BASE_URL}/api/features`, {
        headers: { Authorization: `Bearer ${user_data?.token}` },
      })
      .then((res) => setFeatureCatalog(res.data.data || {}));

    if (isEdit && id) {
      axios
        .get(`${BASE_URL}/api/stores/${id}/features`, {
          headers: { Authorization: `Bearer ${user_data?.token}` },
        })
        .then((res) => setSelectedFeatures(res.data.data || []));
    }
  }, [id]);

  const toggleFeature = (key) => {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  };

  const featureKeys = Object.keys(featureCatalog);
  const allFeaturesSelected =
    featureKeys.length > 0 &&
    featureKeys.every((key) => selectedFeatures.includes(key));

  const toggleAllFeatures = () => {
    setSelectedFeatures(allFeaturesSelected ? [] : featureKeys);
  };

  useEffect(() => {
    if (isEdit && !editingData) {
      fetchStore();
    }
  }, [id]);

  const storeSchema = Yup.object().shape({
    name: Yup.string().required("Store name is required"),
    address: Yup.string().required("Address is required"),
    state: Yup.string().required("State is required"),
    phone: Yup.string()
      .matches(/^[0-9]{10}$/, "Phone must be exactly 10 digits")
      .required("Phone number is required"),
    contact_person_name: Yup.string().required(
      "Contact person name is required",
    ),
    gstin: Yup.string().required("GSTIN is required"),
    username: Yup.string().required("Username is required"),

    password: Yup.string().test(
      "password-rules",
      "Password must be at least 6 characters",
      function (value) {
        if (!isEdit) {
          if (!value) {
            return this.createError({ message: "Password is required" });
          }
          return value.length >= 6;
        }
        if (!value) return true;
        return value.length >= 6;
      },
    ),

    password_confirmation: Yup.string().test(
      "password-confirmation-rules",
      "Passwords must match",
      function (value) {
        const { password } = this.parent;
        if (!isEdit) {
          if (!value) {
            return this.createError({
              message: "Confirm password is required",
            });
          }
          return value === password;
        }
        if (!password) return true;
        if (!value) {
          return this.createError({
            message: "Please confirm the new password",
          });
        }
        return value === password;
      },
    ),

    logo: Yup.mixed().when([], {
      is: () => !isEdit,
      then: () =>
        Yup.mixed()
          .required("Logo is required")
          .test(
            "fileType",
            "The logo must be an image (jpeg, png, jpg)",
            (value) =>
              value &&
              ["image/jpeg", "image/png", "image/jpg"].includes(value.type),
          ),
      otherwise: () => Yup.mixed().nullable(),
    }),
  });

  const initialValues = {
    name: editingData?.name || "",
    address: editingData?.address || "",
    state: editingData?.state || "",
    phone: editingData?.phone || "",
    contact_person_name: editingData?.contact_person_name || "",
    gstin: editingData?.gstin || "",
    logo: editingData?.logo || null,
    tagline: editingData?.tagline || "",
    username: editingData?.username || "",
    password: "",
    password_confirmation: "",
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    const user_data = JSON.parse(localStorage.getItem("user_detail"));

    try {
      const formData = new FormData();

      formData.append("name", values.name);
      formData.append("address", values.address);
      formData.append("state", values.state);
      formData.append("phone", values.phone);
      formData.append("contact_person_name", values.contact_person_name);
      formData.append("gstin", values.gstin);
      formData.append("tagline", values.tagline || "");
      formData.append("username", values.username);

      if (values.password) {
        formData.append("password", values.password);
        formData.append("password_confirmation", values.password_confirmation);
      }

      if (values.logo instanceof File) {
        formData.append("logo", values.logo);
      }

      selectedFeatures.forEach((key) => formData.append("features[]", key));
      if (selectedFeatures.length === 0) formData.append("features", "");

      let response;

      if (isEdit) {
        response = await axios.post(
          `${BASE_URL}/api/stores/${id}?_method=PUT`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${user_data?.token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
      } else {
        response = await axios.post(`${BASE_URL}/api/stores`, formData, {
          headers: {
            Authorization: `Bearer ${user_data?.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.success(response.data?.message || "Store saved successfully!");
      navigate("/store");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong!");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="main-content-inner">
          <div className="main-content-wrap">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>Store Details</h3>
            <ul className="breadcrumbs flex items-center gap10">
              <li>
                <Link to="/dashboard">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="/store">
                  <div className="text-tiny">Store</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">Store Details</div>
              </li>
            </ul>
          </div>

          <div className="wg-box">
            <Formik
              initialValues={initialValues}
              validationSchema={storeSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, setFieldValue, values }) => (
                <Form
                  className="form-new-product form-style-1"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    columnGap: "20px",
                    rowGap: "20px",
                  }}
                >
                  {/* NAME */}
                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Store Name <span className="tf-color-1">*</span>
                      </div>
                      <Field
                        type="text"
                        name="name"
                        placeholder="Enter store name"
                        readOnly={isEdit}
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="name"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">Tagline</div>
                      <Field
                        type="text"
                        name="tagline"
                        placeholder="Enter store tagline (optional)"
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="tagline"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Address <span className="tf-color-1">*</span>
                      </div>
                      <Field
                        type="text"
                        name="address"
                        placeholder="Enter address"
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="address"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        State <span className="tf-color-1">*</span>
                      </div>
                      <div
                        className="select flex-grow"
                        style={{ width: "100%" }}
                      >
                        <Field
                          as="select"
                          name="state"
                          style={{ width: "100%" }}
                        >
                          <option value="">Select state</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Arunachal Pradesh">
                            Arunachal Pradesh
                          </option>
                          <option value="Assam">Assam</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Chhattisgarh">Chhattisgarh</option>
                          <option value="Goa">Goa</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Haryana">Haryana</option>
                          <option value="Himachal Pradesh">
                            Himachal Pradesh
                          </option>
                          <option value="Jharkhand">Jharkhand</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Kerala">Kerala</option>
                          <option value="Madhya Pradesh">Madhya Pradesh</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Manipur">Manipur</option>
                          <option value="Meghalaya">Meghalaya</option>
                          <option value="Mizoram">Mizoram</option>
                          <option value="Nagaland">Nagaland</option>
                          <option value="Odisha">Odisha</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Sikkim">Sikkim</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Tripura">Tripura</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="Uttarakhand">Uttarakhand</option>
                          <option value="West Bengal">West Bengal</option>
                          <option value="Andaman and Nicobar Islands">
                            Andaman and Nicobar Islands
                          </option>
                          <option value="Chandigarh">Chandigarh</option>
                          <option value="Dadra and Nagar Haveli and Daman and Diu">
                            Dadra and Nagar Haveli and Daman and Diu
                          </option>
                          <option value="Delhi">Delhi</option>
                          <option value="Jammu and Kashmir">
                            Jammu and Kashmir
                          </option>
                          <option value="Ladakh">Ladakh</option>
                          <option value="Lakshadweep">Lakshadweep</option>
                          <option value="Puducherry">Puducherry</option>
                        </Field>
                      </div>
                      <ErrorMessage
                        name="state"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* PHONE */}
                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Phone <span className="tf-color-1">*</span>
                      </div>
                      <Field
                        type="text"
                        name="phone"
                        placeholder="Enter phone number"
                        maxLength={10}
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="phone"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Contact Person <span className="tf-color-1">*</span>
                      </div>
                      <Field
                        type="text"
                        name="contact_person_name"
                        placeholder="Enter contact person name"
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="contact_person_name"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        GSTIN <span className="tf-color-1">*</span>
                      </div>
                      <Field
                        type="text"
                        name="gstin"
                        placeholder="Enter GSTIN"
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="gstin"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Username <span className="tf-color-1">*</span>
                      </div>
                      <Field
                        type="text"
                        name="username"
                        placeholder="Enter username"
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="username"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Password{" "}
                        {!isEdit && <span className="tf-color-1">*</span>}
                      </div>
                      <Field
                        type="text"
                        name="password"
                        placeholder={
                          isEdit
                            ? "Leave blank to keep current password"
                            : "Enter password"
                        }
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="password"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Confirm Password{" "}
                        {!isEdit && <span className="tf-color-1">*</span>}
                      </div>
                      <Field
                        type="text"
                        name="password_confirmation"
                        placeholder="Re-enter password"
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="password_confirmation"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  <fieldset
                    style={{
                      border: "none",
                      padding: 0,
                      margin: 0,
                      gridColumn: "1 / -1",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div className="body-title">
                        Logo {!isEdit && <span className="tf-color-1">*</span>}
                      </div>
                      <input
                        type="file"
                        name="logo"
                        accept="image/*"
                        onChange={(event) => {
                          setFieldValue("logo", event.currentTarget.files[0]);
                        }}
                        style={{ width: "100%" }}
                      />
                      <ErrorMessage
                        name="logo"
                        component="p"
                        className="error-text"
                      />

                      {values.logo !== null && (
                        <img
                          src={
                            values.logo instanceof File
                              ? URL.createObjectURL(values.logo)
                              : `${process.env.REACT_APP_API_BASE_URL}/storage/${values.logo}`
                          }
                          alt="Logo Preview"
                          className="object-cover mt-2"
                          style={{ width: "310px", height: "110px" }}
                        />
                      )}
                    </div>
                  </fieldset>

                  <fieldset
                    style={{
                      border: "none",
                      padding: 0,
                      margin: 0,
                      gridColumn: "1 / -1",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          className="body-title"
                          style={{
                            fontWeight: 600,
                            fontSize: "16px",
                            color: "#1f2937",
                            margin: 0,
                          }}
                        >
                          Features
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
                            {selectedFeatures.length} of {featureKeys.length}{" "}
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
                            backgroundColor: allFeaturesSelected
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
                            checked={allFeaturesSelected}
                            onChange={toggleAllFeatures}
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
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(10, 1fr)",
                          gap: "14px",
                        }}
                      >
                        {Object.entries(featureCatalog).map(([key, info]) => {
                          const isSelected = selectedFeatures.includes(key);

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
                                onChange={() => toggleFeature(key)}
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
                    </div>
                  </fieldset>

                  <div className="bot" style={{ gridColumn: "1 / -1" }}>
                    <button
                      className="tf-button w208"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? editingData
                          ? "Updating..."
                          : "Creating..."
                        : editingData
                          ? "Update"
                          : "Save"}
                    </button>
                    <button type="button" className="ml-5 tf-button style-1">
                      <a
                        href="/store"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {" "}
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

export default CreateStore;
