import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";

const CreateEditSaleBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams(); // if id exists -> Edit Mode
  const history = useHistory();
  const appData = useAppData();
  const branches = appData?.managerBranches || [];
  const [suppliers, setSupplierBill] = useState([]);
  const [products, setProducts] = useState([]);

  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const isEdit = Boolean(id);

  const fetchBranch = () => {
    appData?.loadManagerBranches(); 
  };

  useEffect(() => {
    fetchBranch();
  }, []);

  const fetchSupplierBill = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/suppliers`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setSupplierBill(response.data.suppliers);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
  useEffect(() => {
    fetchSupplierBill();
  }, []);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/products`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
  useEffect(() => {
    fetchProduct();
  }, []);

  const initialValues = {
    lines: [
      {
        product_id: "",
        qty: "",
      },
    ],
  };

  const validationSchema = Yup.object({
    lines: Yup.array()
      .of(
        Yup.object({
          product_id: Yup.number().required("Product required"),
          qty: Yup.number()
            .min(1, "Must be at least 1")
            .required("Qty required"),
        })
      )
      .min(1, "Add at least one product"),
  });

  const handleSubmit = async (values) => {
    try {
      const user = JSON.parse(localStorage.getItem("user_data"));

      const response = await axios.post("/sales-bill", values, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      });
      toast.success("Sales Bill Created Successfully!");
    } catch (error) {
      console.error("API Error:", error.response?.data);
      alert(error.response?.data?.message || "Error creating sales bill");
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-8">
            {isEdit ? "Edit Purchase Bill" : "Create Purchase Bill"}
          </h3>

          <div className="wg-box">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ values }) => (
                <Form>
                  <FieldArray name="lines">
                    {({ push, remove }) => (
                      <>
                        {values?.lines?.map((line, index) => (
                          <div className="sales-line-box" key={index}>
                            <h4 className="sales-line-title">
                              Product {index + 1}
                            </h4>

                            {/* Product Field */}
                            <div className="sales-field-row">
                              <label className="sales-field-label">
                                Product
                              </label>

                              <Field
                                as="select"
                                name={`lines.${index}.product_id`}
                                className="sales-select"
                              >
                                <option value="">Select Product</option>
                                {products.map((p) => (
                                  <option value={p.id} key={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </Field>

                              <ErrorMessage
                                component="div"
                                className="sales-error"
                                name={`lines.${index}.product_id`}
                              />
                            </div>

                            {/* Qty Field */}
                            <div className="sales-field-row">
                              <label className="sales-field-label">Qty</label>

                              <Field
                                type="number"
                                name={`lines.${index}.qty`}
                                className="sales-input"
                                placeholder="Enter Qty"
                              />

                              <ErrorMessage
                                component="div"
                                className="sales-error"
                                name={`lines.${index}.qty`}
                              />
                            </div>

                            <button
                              type="button"
                              className="sales-remove-btn"
                              onClick={() => remove(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="sales-add-btn"
                          onClick={() => push({ product_id: "", qty: "" })}
                        >
                          + Add Product
                        </button>
                      </>
                    )}
                  </FieldArray>

                  <button type="submit" className="sales-submit-btn">
                    Submit Sales Bill
                  </button>
                   <button type="button" className="ml-5"><a href="/sale-bill"> Cancel</a></button>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditSaleBill;
