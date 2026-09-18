import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";

const CreateEditCategory = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const history = useHistory();

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_category = localStorage.getItem("category_detail");

  const incomingCategory = store_category && JSON.parse(store_category);
  const isEdit = Boolean(id);

  const [initialValues, setInitialValues] = useState({
    name: "",
    description: "",
    parent_id: "",
  });

  const [categories, setCategories] = useState([]);

  const loadCategoryData = () => {
    if (incomingCategory) {
      setInitialValues({
        name: incomingCategory.name,
        description: incomingCategory.description,
        parent_id: incomingCategory.parent_id,
      });
    }
  };

  const fetchCategory = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/categories`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    loadCategoryData();
    fetchCategory();
  }, []);

  // Validation Schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    description: Yup.string().required("Description is required"),
    // parent_id: Yup.string().required("Parent Id is required"),
  });

  // Submit (Create + Update)
  const handleSubmit = async (values) => {
    try {
      let url = "";
      let method = "";

      if (isEdit) {
        // UPDATE PRODUCT
        url = `${BASE_URL}/api/categories/${id}`;
        method = "put";
      } else {
        // CREATE PRODUCT
        url = `${BASE_URL}/api/categories`;
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
      toast.success(isEdit ? "Category Updated!" : "Category Created!");
      history.push("/category");
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">
            {isEdit ? "Edit Category" : "Create Category"}
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
                    <fieldset className="col-md-6 mb-15">
                      <div className="body-title">Name *</div>
                      <div className="body-content">
                        <Field
                          type="text"
                          name="name"
                          placeholder="Enter category name"
                          className="mb-5"
                        />
                        <ErrorMessage
                          name="name"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                    <fieldset className="col-md-6 mb-15">
                      <div className="body-title">Description *</div>
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
                  <fieldset className="col-md-6 mb-15">
                    <div className="body-title">Parent Categories *</div>
                    <div className="body-content">
                      <Field as="select" name="parent_id" className="mb-5">
                        <option value="">Select Parent Category</option>
                        {categories.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Field>
                      {/* <ErrorMessage
                        name="parent_id"
                        className="error-text"
                        component="div"
                      /> */}
                    </div>
                  </fieldset>

                  <div className="flex col">
                    {/* SUBMIT BUTTON */}
                    <button className="tf-button w208" type="submit">
                      {isEdit ? "Update Category" : "Create Category"}
                    </button>
                    <button type="button" className="ml-5">
                      <a href="/category"> Cancel</a>
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

export default CreateEditCategory;
