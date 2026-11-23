import React, { useEffect, useState } from "react";
import Layout from "./layout";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

/* ------------------------------------------------------------------ */
/*  Limits + input filters (galat character type hi nahi hoga)         */
/* ------------------------------------------------------------------ */
const LIMITS = {
  name: 50,
  tagline: 60,
  address: 150,
  phone: 10,
  contact: 40,
  gstin: 15,
  username: 10,
  password: 12,
  licence: 30,
  pharmacist: 40,
  regNo: 20,
};

const LOGO_MAX_MB = 2;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// GSTIN ke har position ka allowed character: 22AAAAA0000A1Z5
const GSTIN_POSITIONS = [
  /\d/,
  /\d/,
  /[A-Z]/,
  /[A-Z]/,
  /[A-Z]/,
  /[A-Z]/,
  /[A-Z]/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /[A-Z]/,
  /[1-9A-Z]/,
  /Z/,
  /[0-9A-Z]/,
];

// leading space hatao + double space ek karo
const tidy = (v) => v.replace(/^\s+/, "").replace(/\s{2,}/g, " ");

const filters = {
  name: (v) => tidy(v.replace(/[^A-Za-z0-9 &.'\-]/g, "")).slice(0, LIMITS.name),
  tagline: (v) =>
    tidy(v.replace(/[^A-Za-z0-9 &.,'!\-]/g, "")).slice(0, LIMITS.tagline),
  address: (v) =>
    tidy(v.replace(/[^A-Za-z0-9 ,.\/#()&'\-]/g, "")).slice(0, LIMITS.address),
  phone: (v) => {
    let digits = v.replace(/\D/g, "").slice(0, LIMITS.phone);
    // Indian mobile number 6-9 se hi shuru hota hai
    if (digits && !/^[6-9]/.test(digits)) digits = digits.slice(1);
    return digits;
  },
  contact: (v) => tidy(v.replace(/[^A-Za-z .]/g, "")).slice(0, LIMITS.contact),
  gstin: (v) => {
    const upper = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let out = "";
    for (const ch of upper) {
      if (out.length >= LIMITS.gstin) break;
      if (GSTIN_POSITIONS[out.length].test(ch)) out += ch;
    }
    return out;
  },
  username: (v) => v.replace(/[^A-Za-z0-9_]/g, "").slice(0, LIMITS.username),
  password: (v) => v.replace(/\s/g, "").slice(0, LIMITS.password),
  licence: (v) =>
    v
      .toUpperCase()
      .replace(/[^A-Z0-9\/\-]/g, "")
      .slice(0, LIMITS.licence),
  pharmacist: (v) =>
    tidy(v.replace(/[^A-Za-z .]/g, "")).slice(0, LIMITS.pharmacist),
  regNo: (v) =>
    v
      .toUpperCase()
      .replace(/[^A-Z0-9\/\-]/g, "")
      .slice(0, LIMITS.regNo),
};

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const fieldsetStyle = { border: "none", padding: 0, margin: 0, minWidth: 0 };
const columnStyle = { display: "flex", flexDirection: "column", gap: "8px" };

/* ------------------------------------------------------------------ */
/*  Reusable text field (filter + maxLength + error)                   */
/* ------------------------------------------------------------------ */
const TextField = ({
  name,
  label,
  required,
  placeholder,
  filter,
  maxLength,
  setFieldValue,
  value,
  readOnly,
  span,
  inputMode,
  autoComplete,
}) => (
  <fieldset
    style={{ ...fieldsetStyle, gridColumn: span ? `span ${span}` : undefined }}
  >
    <div style={columnStyle}>
      <div className="body-title">
        {label} {required && <span className="tf-color-1">*</span>}
      </div>
      <Field
        type="text"
        name={name}
        placeholder={placeholder}
        readOnly={readOnly}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete || "off"}
        style={{ width: "100%" }}
        onChange={(e) => setFieldValue(name, filter(e.target.value))}
      />
      {typeof value === "string" && maxLength ? (
        <small style={{ color: "#94a3b8", fontSize: "12px", textAlign: "right" }}>
          {value.length}/{maxLength}
        </small>
      ) : null}
      <ErrorMessage name={name} component="p" className="error-text" />
    </div>
  </fieldset>
);

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

  // E-commerce (online_store) ka alag Yes/No card hai, isliye ye neeche ki list se bahar rahega
  const ECOMMERCE_KEY = "online_store";
  const ecommerceOn = selectedFeatures.includes(ECOMMERCE_KEY);

  const setEcommerce = (on) => {
    setSelectedFeatures((prev) => {
      const without = prev.filter((f) => f !== ECOMMERCE_KEY);
      return on ? [...without, ECOMMERCE_KEY] : without;
    });
  };

  const featureKeys = Object.keys(featureCatalog).filter(
    (key) => key !== ECOMMERCE_KEY,
  );
  const selectedCount = selectedFeatures.filter((key) =>
    featureKeys.includes(key),
  ).length;
  const allFeaturesSelected =
    featureKeys.length > 0 &&
    featureKeys.every((key) => selectedFeatures.includes(key));

  const toggleAllFeatures = () => {
    setSelectedFeatures((prev) => {
      const keepEcom = prev.includes(ECOMMERCE_KEY) ? [ECOMMERCE_KEY] : [];
      return allFeaturesSelected ? keepEcom : [...featureKeys, ...keepEcom];
    });
  };

  useEffect(() => {
    if (isEdit && !editingData) {
      fetchStore();
    }
  }, [id]);

  const storeSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .min(3, "Store name must be at least 3 characters")
      .max(LIMITS.name, `Maximum ${LIMITS.name} characters allowed`)
      .required("Store name is required"),

    tagline: Yup.string()
      .trim()
      .max(LIMITS.tagline, `Maximum ${LIMITS.tagline} characters allowed`),

    address: Yup.string()
      .trim()
      .min(10, "Please enter the full address (at least 10 characters)")
      .max(LIMITS.address, `Maximum ${LIMITS.address} characters allowed`)
      .test(
        "address-has-letters",
        "Address must contain letters, not only numbers",
        (v) => !v || /[A-Za-z]/.test(v),
      )
      .required("Address is required"),

    state: Yup.string().required("State is required"),

    phone: Yup.string()
      .matches(
        /^[6-9][0-9]{9}$/,
        "Enter a valid 10 digit mobile number starting with 6, 7, 8 or 9",
      )
      .required("Phone number is required"),

    contact_person_name: Yup.string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(LIMITS.contact, `Maximum ${LIMITS.contact} characters allowed`)
      .matches(/^[A-Za-z .]+$/, "Only letters are allowed")
      .required("Contact person name is required"),

    gstin: Yup.string()
      .matches(GSTIN_REGEX, "Enter a valid 15 character GSTIN (e.g. 24AAAAA0000A1Z5)")
      .required("GSTIN is required"),

    username: Yup.string()
      .min(4, "Username must be at least 4 characters")
      .max(LIMITS.username, `Maximum ${LIMITS.username} characters allowed`)
      .matches(
        /^[A-Za-z0-9_]+$/,
        "Only letters, numbers and underscore are allowed",
      )
      .required("Username is required"),

    drug_licence_no: Yup.string()
      .nullable()
      .test(
        "pharmacy-licence",
        "Drug licence no. is required for a pharmacy store",
        (v) => !selectedFeatures.includes("pharmacy") || !!(v && v.trim()),
      ),
    pharmacist_name: Yup.string()
      .nullable()
      .test(
        "pharmacy-pharmacist",
        "Pharmacist name is required for a pharmacy store",
        (v) => !selectedFeatures.includes("pharmacy") || !!(v && v.trim()),
      ),
    pharmacist_reg_no: Yup.string().nullable(),

    password: Yup.string().test(
      "password-rules",
      `Password must be 6 to ${LIMITS.password} characters`,
      function (value) {
        if (!isEdit) {
          if (!value) {
            return this.createError({ message: "Password is required" });
          }
          return value.length >= 6 && value.length <= LIMITS.password;
        }
        if (!value) return true;
        return value.length >= 6 && value.length <= LIMITS.password;
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
            (value) => value && LOGO_TYPES.includes(value.type),
          )
          .test(
            "fileSize",
            `Logo must be smaller than ${LOGO_MAX_MB}MB`,
            (value) =>
              !(value instanceof File) ||
              value.size <= LOGO_MAX_MB * 1024 * 1024,
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
    drug_licence_no: editingData?.drug_licence_no || "",
    pharmacist_name: editingData?.pharmacist_name || "",
    pharmacist_reg_no: editingData?.pharmacist_reg_no || "",
    password: "",
    password_confirmation: "",
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    const user_data = JSON.parse(localStorage.getItem("user_detail"));

    try {
      const formData = new FormData();

      formData.append("name", values.name.trim());
      formData.append("address", values.address.trim());
      formData.append("state", values.state);
      formData.append("phone", values.phone);
      formData.append("contact_person_name", values.contact_person_name.trim());
      formData.append("gstin", values.gstin);
      formData.append("tagline", (values.tagline || "").trim());
      formData.append("username", values.username);
      formData.append("drug_licence_no", values.drug_licence_no || "");
      formData.append("pharmacist_name", values.pharmacist_name || "");
      formData.append("pharmacist_reg_no", values.pharmacist_reg_no || "");

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
      const apiErrors = error.response?.data?.errors;
      toast.error(
        (apiErrors && Object.values(apiErrors).flat()[0]) ||
          error.response?.data?.message ||
          "Something went wrong!",
      );
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
                  style={{ display: "block", width: "100%", maxWidth: "none" }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      columnGap: "20px",
                      rowGap: "20px",
                    }}
                  >
                  {/* NAME */}
                  <TextField
                    name="name"
                    label="Store Name"
                    required
                    placeholder="Enter store name"
                    filter={filters.name}
                    maxLength={LIMITS.name}
                    setFieldValue={setFieldValue}
                    value={values.name}
                    readOnly={isEdit}
                  />

                  {/* TAGLINE */}
                  <TextField
                    name="tagline"
                    label="Tagline"
                    placeholder="Enter store tagline (optional)"
                    filter={filters.tagline}
                    maxLength={LIMITS.tagline}
                    setFieldValue={setFieldValue}
                    value={values.tagline}
                  />

                  {/* ADDRESS (full address, 2 column wide) */}
                  <TextField
                    name="address"
                    label="Address"
                    required
                    placeholder="Shop no., building, area, city, pincode"
                    filter={filters.address}
                    maxLength={LIMITS.address}
                    setFieldValue={setFieldValue}
                    value={values.address}
                    span={2}
                    autoComplete="street-address"
                  />

                  {/* STATE */}
                  <fieldset style={fieldsetStyle}>
                    <div style={columnStyle}>
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
                          {STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
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
                  <TextField
                    name="phone"
                    label="Phone"
                    required
                    placeholder="10 digit mobile number"
                    filter={filters.phone}
                    maxLength={LIMITS.phone}
                    setFieldValue={setFieldValue}
                    value={values.phone}
                    inputMode="numeric"
                  />

                  {/* CONTACT PERSON */}
                  <TextField
                    name="contact_person_name"
                    label="Contact Person"
                    required
                    placeholder="Enter contact person name"
                    filter={filters.contact}
                    maxLength={LIMITS.contact}
                    setFieldValue={setFieldValue}
                    value={values.contact_person_name}
                  />

                  {/* GSTIN */}
                  <TextField
                    name="gstin"
                    label="GSTIN"
                    required
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    filter={filters.gstin}
                    maxLength={LIMITS.gstin}
                    setFieldValue={setFieldValue}
                    value={values.gstin}
                  />

                  {selectedFeatures.includes("pharmacy") && (
                    <>
                      <TextField
                        name="drug_licence_no"
                        label="Drug Licence No."
                        required
                        placeholder="Enter drug licence number"
                        filter={filters.licence}
                        maxLength={LIMITS.licence}
                        setFieldValue={setFieldValue}
                        value={values.drug_licence_no}
                      />

                      <TextField
                        name="pharmacist_name"
                        label="Pharmacist Name"
                        required
                        placeholder="Enter pharmacist name"
                        filter={filters.pharmacist}
                        maxLength={LIMITS.pharmacist}
                        setFieldValue={setFieldValue}
                        value={values.pharmacist_name}
                      />

                      <TextField
                        name="pharmacist_reg_no"
                        label="Pharmacist Reg. No."
                        placeholder="Enter registration number"
                        filter={filters.regNo}
                        maxLength={LIMITS.regNo}
                        setFieldValue={setFieldValue}
                        value={values.pharmacist_reg_no}
                      />
                    </>
                  )}

                  {/* USERNAME */}
                  <TextField
                    name="username"
                    label="Username"
                    required
                    placeholder="Letters, numbers, underscore"
                    filter={filters.username}
                    maxLength={LIMITS.username}
                    setFieldValue={setFieldValue}
                    value={values.username}
                  />

                  {/* PASSWORD */}
                  <TextField
                    name="password"
                    label="Password"
                    required={!isEdit}
                    placeholder={
                      isEdit
                        ? "Leave blank to keep current password"
                        : "6 to 12 characters"
                    }
                    filter={filters.password}
                    maxLength={LIMITS.password}
                    setFieldValue={setFieldValue}
                    value={values.password}
                    autoComplete="new-password"
                  />

                  {/* CONFIRM PASSWORD */}
                  <TextField
                    name="password_confirmation"
                    label="Confirm Password"
                    required={!isEdit}
                    placeholder="Re-enter password"
                    filter={filters.password}
                    maxLength={LIMITS.password}
                    setFieldValue={setFieldValue}
                    value={values.password_confirmation}
                    autoComplete="new-password"
                  />

                  </div>

                  {/* LOGO */}
                  <fieldset style={{ ...fieldsetStyle, width: "100%", marginTop: "20px" }}>
                    <div style={columnStyle}>
                      <div className="body-title">
                        Logo {!isEdit && <span className="tf-color-1">*</span>}
                      </div>
                      <input
                        type="file"
                        name="logo"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={(event) => {
                          const file = event.currentTarget.files[0];
                          if (!file) return;

                          if (!LOGO_TYPES.includes(file.type)) {
                            toast.error("Only jpeg, jpg or png image allowed.");
                            event.currentTarget.value = "";
                            return;
                          }
                          if (file.size > LOGO_MAX_MB * 1024 * 1024) {
                            toast.error(
                              `Logo must be smaller than ${LOGO_MAX_MB}MB.`,
                            );
                            event.currentTarget.value = "";
                            return;
                          }
                          setFieldValue("logo", file);
                        }}
                        style={{ width: "100%" }}
                      />
                      <small style={{ color: "#94a3b8", fontSize: "12px" }}>
                        JPG or PNG, maximum {LOGO_MAX_MB}MB
                      </small>
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

                  {/* E-COMMERCE YES / NO */}
                  {featureCatalog.online_store && (
                    <fieldset
                      style={{ ...fieldsetStyle, width: "100%", marginTop: "20px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap",
                          padding: "16px 18px",
                          borderRadius: "8px",
                          border: ecommerceOn
                            ? "1px solid #86efac"
                            : "1px solid #e2e8f0",
                          backgroundColor: ecommerceOn ? "#f0fdf4" : "#f8fafc",
                        }}
                      >
                        <div style={{ minWidth: "240px", flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "16px",
                              color: "#1f2937",
                            }}
                          >
                            E-commerce (Online Store)
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "13px",
                              color: "#64748b",
                            }}
                          >
                            Yes karne par ye store customer app / website par
                            dikhega aur online orders le sakega. No karne par
                            store sirf POS ke liye rahega.
                          </div>
                        </div>

                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          {[
                            { label: "Yes", value: true },
                            { label: "No", value: false },
                          ].map((opt) => {
                            const active = ecommerceOn === opt.value;
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setEcommerce(opt.value)}
                                aria-pressed={active}
                                style={{
                                  minWidth: "84px",
                                  padding: "9px 18px",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  border: active
                                    ? opt.value
                                      ? "1px solid #16a34a"
                                      : "1px solid #64748b"
                                    : "1px solid #cbd5e1",
                                  backgroundColor: active
                                    ? opt.value
                                      ? "#16a34a"
                                      : "#64748b"
                                    : "#ffffff",
                                  color: active ? "#ffffff" : "#374151",
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </fieldset>
                  )}

                  {/* FEATURES */}
                  <fieldset style={{ ...fieldsetStyle, width: "100%", marginTop: "20px" }}>
                    <div style={columnStyle}>
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
                            {selectedCount} of {featureKeys.length} selected
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

                      {/* Desktop par 1 line mein 3, tablet par 2, mobile par 1 */}
                      <style>{`
                        .feature-grid {
                          display: grid;
                          grid-template-columns: repeat(3, minmax(0, 1fr));
                          gap: 14px;
                          width: 50vw;
                        }
                        @media (max-width: 991px) {
                          .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        }
                        @media (max-width: 575px) {
                          .feature-grid { grid-template-columns: minmax(0, 1fr); }
                        }
                      `}</style>
                      <div className="feature-grid">
                        {Object.entries(featureCatalog)
                          .filter(([key]) => key !== ECOMMERCE_KEY)
                          .map(([key, info]) => {
                            const isSelected = selectedFeatures.includes(key);

                            return (
                              <label
                                key={key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "13px 14px",
                                  minHeight: "56px",
                                  minWidth: 0,
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
                                    flexShrink: 0,
                                    accentColor: "#3b82f6",
                                    cursor: "pointer",
                                  }}
                                />
                                {info.icon && (
                                  <span style={{ flexShrink: 0 }}>
                                    {info.icon}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "14px",
                                    lineHeight: 1.35,
                                    wordBreak: "break-word",
                                    minWidth: 0,
                                  }}
                                >
                                  {info.label}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </fieldset>

                  <div className="bot" style={{ width: "100%", marginTop: "20px" }}>
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