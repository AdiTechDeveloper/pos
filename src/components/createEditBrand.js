import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";

const CreateEditBrand = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const history = useHistory();

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_brand = localStorage.getItem("brand_detail");

  const incomingBrand = store_brand && JSON.parse(store_brand);
  const isEdit = Number(id);

  const [initialValues, setInitialValues] = useState({
    name: "",
    description: "",
  });

  const loadBrandData = () => {
    if (incomingBrand) {
      setInitialValues({
        name: incomingBrand.name,
        description: incomingBrand.description,
      });
    }
  };

  useEffect(() => {
    loadBrandData();
  }, []);

  // Validation Schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    description: Yup.string().required("Description is required"),
  });

  // Submit (Create + Update)
  const handleSubmit = async (values) => {
    try {
      let url = "";
      let method = "";

      if (isEdit) {
        // UPDATE PRODUCT
        url = `${BASE_URL}/api/brands/${id}`;
        method = "put";
      } else {
        // CREATE PRODUCT
        url = `${BASE_URL}/api/brands`;
        method = "post";
      }

      const response = await axios({
        method,
        url,
        data: values,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      toast.success(isEdit ? "Brand Updated!" : "Brand Created!");
      history.push("/brand");
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">{isEdit ? "Edit Brand" : "Create Brand"}</h3>

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
                  <div className="row mb-20">
                    <fieldset className="col-md-4">
                      <div className="body-title mb-10">Name *</div>
                      <div className="body-content mb-15">
                        <Field
                          type="text"
                          name="name"
                          placeholder="Enter brand name"
                          className="mb-5"
                        />
                        <ErrorMessage
                          name="name"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                    <fieldset className="col-md-6">
                      <div className="body-title mb-10">Description *</div>
                      <div className="body-content">
                        <Field
                          as="textarea"
                          name="description"
                          className="mb-5 form-control small-textarea"
                          placeholder="Enter description"
                        />
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
                      {isEdit ? "Update Brand" : "Create Brand"}
                    </button>

                    <button type="button" className="ml-5">
                      <a href="/brand"> Cancel</a>
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

export default CreateEditBrand;
