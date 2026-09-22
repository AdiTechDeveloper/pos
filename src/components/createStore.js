import React, { useEffect, useState } from "react";
import Layout from "./layout";
import { Link, useLocation, useHistory, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const CreateStore = () => {
  const location = useLocation();
  const history = useHistory();
  const { id } = useParams();
  const isEdit = Boolean(id);

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
      history.push("/store");
    } finally {
      setLoading(false);
    }
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
      history.push("/store");
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
            <h3>Store Information</h3>
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
                <div className="text-tiny">Store Information</div>
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
                <Form className="form-new-product form-style-1">
                  {/* NAME */}
                  <fieldset className="name">
                    <div className="body-title">
                      Store Name <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="name"
                        placeholder="Enter store name"
                        readOnly={isEdit}
                      />
                      <ErrorMessage
                        name="name"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* TAGLINE (optional) */}
                  <fieldset className="name">
                    <div className="body-title">Tagline</div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="tagline"
                        placeholder="Enter store tagline (optional)"
                      />
                      <ErrorMessage
                        name="tagline"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* ADDRESS */}
                  <fieldset className="name">
                    <div className="body-title">
                      Address <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="address"
                        placeholder="Enter address"
                      />
                      <ErrorMessage
                        name="address"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* STATE */}
                  <fieldset className="state">
                    <div className="body-title">
                      State <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <div className="select flex-grow">
                        <Field as="select" name="state">
                          <option value="">Select state</option>

                          {/* States */}
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

                          {/* Union Territories (optional) */}
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
                  <fieldset className="name">
                    <div className="body-title">
                      Phone <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="phone"
                        placeholder="Enter phone number"
                        maxLength={10}
                      />
                      <ErrorMessage
                        name="phone"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* CONTACT PERSON NAME */}
                  <fieldset className="name">
                    <div className="body-title">
                      Contact Person <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="contact_person_name"
                        placeholder="Enter contact person name"
                      />
                      <ErrorMessage
                        name="contact_person_name"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* GSTIN */}
                  <fieldset className="name">
                    <div className="body-title">
                      GSTIN <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="gstin"
                        placeholder="Enter GSTIN"
                      />
                      <ErrorMessage
                        name="gstin"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* LOGO UPLOAD */}
                  <fieldset className="name">
                    <div className="body-title">
                      Logo {!isEdit && <span className="tf-color-1">*</span>}
                    </div>
                    <div className="field-wrapper">
                      <input
                        type="file"
                        name="logo"
                        accept="image/*"
                        onChange={(event) => {
                          setFieldValue("logo", event.currentTarget.files[0]);
                        }}
                      />
                      <ErrorMessage
                        name="logo"
                        component="p"
                        className="error-text"
                      />

                      {/* Preview */}
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

                  {/* username */}
                  <fieldset className="name">
                    <div className="body-title">
                      Username <span className="tf-color-1">*</span>
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="username"
                        placeholder="Enter username"
                      />
                      <ErrorMessage
                        name="username"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* password */}
                  <fieldset className="name">
                    <div className="body-title">
                      Password{" "}
                      {!isEdit && <span className="tf-color-1">*</span>}
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="password"
                        placeholder={
                          isEdit
                            ? "Leave blank to keep current password"
                            : "Enter password"
                        }
                      />
                      <ErrorMessage
                        name="password"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* confirm-password */}
                  <fieldset className="name">
                    <div className="body-title">
                      Confirm Password{" "}
                      {!isEdit && <span className="tf-color-1">*</span>}
                    </div>
                    <div className="field-wrapper">
                      <Field
                        type="text"
                        name="password_confirmation"
                        placeholder="Re-enter password"
                      />
                      <ErrorMessage
                        name="password_confirmation"
                        component="p"
                        className="error-text"
                      />
                    </div>
                  </fieldset>

                  {/* SUBMIT */}
                  <div className="bot">
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
