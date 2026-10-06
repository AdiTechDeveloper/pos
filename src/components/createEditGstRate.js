import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";
const CreateEditGstRates = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const appData = useAppData();
  const { id } = useParams();
  const navigate = useNavigate(); 

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_gst_rate_detail = localStorage.getItem("gst_rate_detail");

  const incomingGstRateDetail =
    store_gst_rate_detail && JSON.parse(store_gst_rate_detail);
  const isEdit = Boolean(id);

  const [initialValues, setInitialValues] = useState({
    rate: "",
    description: "",
  });
  // If editing → set initial values
  const loadGstData = () => {
    if (incomingGstRateDetail) {
      setInitialValues({
        rate: incomingGstRateDetail.rate,
        description: incomingGstRateDetail.description,
      });
    }
  };
  useEffect(() => {
    loadGstData();
  }, []);

  // Validation Schema
  const validationSchema = Yup.object({
    rate: Yup.string()
      .required("Rate is required")
      .matches(/^\d{1,2}(\.\d+)?$/, "Enter a valid rate"),
    description: Yup.string()
      .required("Description is required")
      .test(
        "max-words",
        "Description can contain maximum 100 words",
        (value) => {
          if (!value) return true;

          return value.trim().split(/\s+/).length <= 100;
        }
      ),
  });


  // Submit (Create + Update)
  // const handleSubmit = async (values) => {
  //   try {
  //     let url = "";
  //     let method = "";

  //     if (isEdit) {
  //       // UPDATE PRODUCT
  //       url = `${BASE_URL}/api/gst-rates/${id}`;
  //       method = "put";
  //     } else {
  //       // CREATE PRODUCT
  //       url = `${BASE_URL}/api/gst-rates`;
  //       method = "post";
  //     }

  //     const response = await axios({
  //       method,
  //       url,
  //       data: values,
  //       headers: {
  //         Accept: "application/json",
  //         Authorization: `Bearer ${user_data.token}`,
  //       },
  //     });
  //     toast.success(isEdit ? "Gst Rate Updated!" : "Gst Rate Created!");
  //     navigate("/gst-rates");
  //   } catch (error) {
  //     console.error("Error saving product:", error);
  //   }
  // };
  
  const handleSubmit = async (values) => {
  try {
    let url = "";
    let method = "";

    if (isEdit) {
      url = `${BASE_URL}/api/gst-rates/${id}`;
      method = "put";
    } else {
      url = `${BASE_URL}/api/gst-rates`;
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

    appData?.invalidate("gstRates");
    await appData?.loadGstRates();

    toast.success(
      isEdit ? "Gst Rate Updated!" : "Gst Rate Created!"
    );

    navigate("/gst-rates");
  } catch (error) {
    console.error("Error saving GST rate:", error);

    toast.error(
      error.response?.data?.message || "Failed to save GST rate"
    );
  }
};

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">
            {isEdit ? "Edit Gst Rates" : "Create Gst Rates"}
          </h3>

          <div className="wg-box wg-content">
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {() => (
                <Form className="wg-form">
                  {/* Name */}
                  <div className="row mb-15">
                    <fieldset className="col-md-2 mb-15">
                      <div className="body-title">Rate *</div>
                      <div className="body-content">
                        <Field
                          type="text"
                          name="rate"
                          placeholder="Enter GST rate"
                          className="mb-5"
                          onInput={(e) => {
                            let value = e.target.value.replace(/[^0-9.]/g, "");

                            const parts = value.split(".");

                            // Maximum 2 digits before decimal
                            if (parts[0].length > 2) {
                              value = parts[0].slice(0, 2);

                              if (parts[1] !== undefined) {
                                value += "." + parts[1];
                              }
                            }

                            // Only one decimal point
                            const decimalParts = value.split(".");
                            if (decimalParts.length > 2) {
                              value = decimalParts[0] + "." + decimalParts.slice(1).join("");
                            }

                            e.target.value = value;
                          }}
                        />
                        <ErrorMessage
                          name="rate"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                    <fieldset className="col-md-4 mb-15">
                      <div className="body-title">Description *</div>

                      <div className="body-content">
                        <Field name="description">
                          {({ field, form }) => (
                            <textarea
                              {...field}
                              className="mb-5 form-control small-textarea"
                              placeholder="Enter description"
                              onChange={(e) => {
                                const value = e.target.value;

                                const words = value.trim()
                                  ? value.trim().split(/\s+/)
                                  : [];

                                if (words.length <= 100) {
                                  form.setFieldValue("description", value);
                                }
                              }}
                            />
                          )}
                        </Field>

                        <ErrorMessage
                          name="description"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                  </div>

                  <div className="flex col">
                    {/* SUBMIT BUTTON */}
                    <button className="tf-button w208" type="submit">
                      {isEdit ? "Update Gst Rates" : "Create Gst Rates"}
                    </button>
                    <button type="button" className="ml-5 tf-button style-1">
                      <a href="/gst-rates" style={{ color: "inherit", textDecoration: "none" }}> Cancel</a>
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

export default CreateEditGstRates;
