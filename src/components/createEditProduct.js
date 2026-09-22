import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";

const CreateEditProduct = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams(); // if id exists -> Edit Mode
  const history = useHistory();

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_product = localStorage.getItem("product_detail");

  const incomingProduct = store_product && JSON.parse(store_product);
  const isEdit = Boolean(id);

  const [brands, setBrands] = useState([]);
  const [barcode, setBarcode] = useState([]);
  const [categories, setCategories] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [brandId, setBrandId] = useState("");
  const [showBrandModel, setShowBrandModel] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [error, setError] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(isEdit);

  let lastTime = 0;

  const [initialValues, setInitialValues] = useState({
    sku: "",
    name: "",
    brand_id: "",
    category_id: "",
    hsn_code: "",
    gst_rate_id: "",
    mrp: "",
    selling_price: "",
    cost_price: "",
    barcode: "",
    gst_inclusive: false,
    is_price_override: 0,
  });

  // Fetch brands
  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/brands`, {
        headers: { Authorization: `Bearer ${user_data.token}` },
      });
      setBrands(response.data.brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };
  const fetchGstRates = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/gst-rates`, {
        headers: { Authorization: `Bearer ${user_data.token}` },
      });
      setGstRates(response.data.gstRates);
    } catch (error) {
      console.error("Error fetching GST rates:", error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/categories`, {
        headers: {
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProduct = async () => {
    if (!id) return;

    try {
      setLoadingProduct(true);

      const response = await axios.get(`${BASE_URL}/api/products/${id}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      if (response.data.status) {
        const product = response.data.product;

        setBrandId(product.brand_id || "");
        setCategoryId(product.category_id || "");

        setInitialValues({
          sku: product.sku || "",
          name: product.name || "",
          brand_id: product.brand_id || "",
          category_id: product.category_id || "",
          hsn_code: product.hsn_code || "",
          gst_rate_id: product.gst_rate_id || "",
          mrp: product.mrp || "",
          selling_price: product.selling_price || "",
          cost_price: product.cost_price || "",
          barcode: product.barcode || "",
          gst_inclusive: product.gst_inclusive == 1,
          is_price_override: product.is_price_override ? 1 : 0,
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to fetch product");
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchGstRates();

    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  // Validation Schema
  const validationSchema = Yup.object({
    name: Yup.string().required("Product Name is required"),
  });

  // Submit (Create + Update)
  const handleSubmit = async (values) => {
    try {
      let url = "";
      let method = "";

      if (isEdit) {
        // UPDATE PRODUCT
        url = `${BASE_URL}/api/products/${id}`;
        method = "put";
      } else {
        // CREATE PRODUCT
        url = `${BASE_URL}/api/products`;
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
      toast.success(isEdit ? "Product Updated!" : "Product Created!");
      history.push("/product");
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    if (newCategory.trim().length < 3) {
      setError("Category name must be at least 3 characters.");
      return;
    }
    setError("");
    const category = {
      id: Date.now(),
      name: newCategory.trim(),
    };
    let url = `${BASE_URL}/api/categories`;
    let method = "post";
    const response = await axios({
      method,
      url,
      data: category,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    toast.success("Category Created!");
    setNewCategory("");
    setCategoryId(category.id);
    setShowCategoryModal(false);
    fetchCategories();
  };

  const saveBrand = async (e) => {
    e.preventDefault();
    if (newBrand.trim().length < 3) {
      setError("Category name must be at least 3 characters.");
      return;
    }
    setError("");
    const brand = {
      id: Date.now(),
      name: newBrand.trim(),
    };
    let url = `${BASE_URL}/api/brands`;
    let method = "post";
    const response = await axios({
      method,
      url,
      data: brand,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    toast.success("Brand Created!");
    setNewBrand("");
    setBrandId(brand.id);
    setShowBrandModel(false);
    fetchBrands();
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">
            {isEdit ? "Edit Product" : "Create Product"}
          </h3>

          <div className="wg-box">
            {loadingProduct ? (
              <div className="text-center p-20">Loading product...</div>
            ) : (
              <Formik
                enableReinitialize
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {() => (
                  <Form className="wg-form">
                    <div className="row mb-20 col-12">
                      {/* Name */}
                      <fieldset className="col-md-3">
                        <div className="body-title">Name *</div>
                        <div className="body-content">
                          <Field
                            type="text"
                            name="name"
                            placeholder="Enter product name"
                            className="mb-5"
                          />
                          <ErrorMessage
                            name="name"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </fieldset>

                      {/* SKU */}
                      <fieldset className="col-md-3">
                        <div className="body-title">SKU</div>
                        <div className="body-content mb-15">
                          <Field
                            type="text"
                            name="sku"
                            placeholder="Enter SKU"
                            className="mb-5"
                          />
                          <ErrorMessage
                            name="sku"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </fieldset>

                      <fieldset className="col-md-3 mb-15">
                        <div className="body-title">Brand *</div>
                        <div className="body-content">
                          <Field name="brand_id" as="select" className="mb-6">
                            {({ field }) => (
                              <select
                                {...field}
                                value={brandId}
                                onChange={(e) => {
                                  field.onChange(e);

                                  const value = e.target.value;
                                  if (value === "add_new") {
                                    setShowBrandModel(true);
                                  }
                                  setBrandId(value);
                                }}
                              >
                                <option value="">Select Brand</option>
                                {brands.map((b) => (
                                  <option value={b.id} key={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                                {!newBrand && (
                                  <option value="add_new">
                                    + Add New Brand
                                  </option>
                                )}
                              </select>
                            )}
                          </Field>
                          <ErrorMessage
                            name="brand_id"
                            className="error-text"
                            component="div"
                          />
                        </div>

                      </fieldset>
                      <fieldset className="col-md-3">
                        <div className="body-title">Category *</div>
                        <div className="body-content">
                          <Field
                            name="category_id"
                            as="select"
                            className="mb-6"
                          >
                            {({ field }) => (
                              <select
                                {...field}
                                value={categoryId}
                                onChange={(e) => {
                                  field.onChange(e);

                                  const value = e.target.value;
                                  if (value === "add_new") {
                                    setShowCategoryModal(true);
                                  }
                                  setCategoryId(value);
                                }}
                              >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                  <option value={c.id} key={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                                {!newCategory && (
                                  <option value="add_new">
                                    + Add New Category
                                  </option>
                                )}
                              </select>
                            )}
                          </Field>
                          <ErrorMessage
                            name="category_id"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </fieldset>
                    </div>

                    {/* Category / GST Rate / HSN */}
                    <div className="row mb-20">

                      <fieldset className="col-md-1">
                        <div className="body-title">Gst Rate *</div>
                        <div className="body-content mb-15">
                          <Field
                            as="select"
                            name="gst_rate_id"
                            className="mb-5"
                          >
                            <option value="">Select Gst Rate</option>
                            {gstRates.map((element) => (
                              <option value={element.id} key={element.id}>
                                {element.rate}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="gst_rate_id"
                            component="div"
                            className="error-text"
                          />
                        </div>
                      </fieldset>

                      <fieldset className="col-md-2">
                        <div className="body-title">HSN</div>
                        <div className="body-content mb-15">
                          <Field
                            type="text"
                            name="hsn_code"
                            placeholder="Enter HSN code"
                            className="mb-5"
                          />
                          <ErrorMessage
                            name="hsn_code"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </fieldset>
                      <fieldset className="col-md-3">
                        <div className="body-title">Barcode</div>
                        <div className="body-content mb-15">
                          <Field name="barcode">
                            {({ field, form }) => (
                              <input
                                {...field}
                                type="text"
                                placeholder="Scan Barcode"
                                autoFocus
                                className="mb-5"
                                onChange={(e) => {
                                  const now = Date.now();
                                  const isScanner = now - lastTime < 30;
                                  lastTime = now;

                                  form.setFieldValue("barcode", e.target.value);
                                  form.setFieldTouched("barcode", true, false);

                                  if (isScanner) {
                                    form.setFieldValue("_scanner", true, false);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();

                                    const barcode = field.value.trim();
                                    if (!barcode) return;

                                    form.setFieldValue(
                                      "_scanner",
                                      false,
                                      false,
                                    );
                                  }
                                }}
                              />
                            )}
                          </Field>
                          <ErrorMessage
                            name="barcode"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </fieldset>
                      <fieldset className="col-md-2">
                        <div className="body-title mb-5">GST Included</div>

                        <Field name="gst_inclusive">
                          {({ field, form }) => {
                            const isIncluded = field.value === true || field.value === 1;

                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <label
                                  style={{
                                    position: "relative",
                                    display: "inline-block",
                                    width: "48px",
                                    height: "26px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    onChange={() =>
                                      form.setFieldValue("gst_inclusive", !isIncluded)
                                    }
                                    style={{
                                      opacity: 0,
                                      width: 0,
                                      height: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      background: isIncluded ? "#22c55e" : "#cbd5e1",
                                      borderRadius: "999px",
                                      transition: "background-color 0.2s ease",
                                    }}
                                  >
                                    <span
                                      style={{
                                        position: "absolute",
                                        top: "3px",
                                        left: isIncluded ? "25px" : "3px",
                                        width: "20px",
                                        height: "20px",
                                        background: "#fff",
                                        borderRadius: "50%",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                        transition: "left 0.2s ease",
                                      }}
                                    />
                                  </span>
                                </label>

                                <span
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: isIncluded ? "#16a34a" : "#64748b",
                                  }}
                                >
                                  {isIncluded ? "Included" : "Excluded"}
                                </span>
                              </div>
                            );
                          }}
                        </Field>
                      </fieldset>

                        <fieldset className="col-md-2">
                        <div className="body-title mb-5">Allow Change Price</div>

                        <Field name="is_price_override">
                          {({ field, form }) => {
                            const isOverride = field.value === true || field.value === 1;

                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <label
                                  style={{
                                    position: "relative",
                                    display: "inline-block",
                                    width: "48px",
                                    height: "26px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isOverride}
                                    onChange={() =>
                                      form.setFieldValue("is_price_override", !isOverride)
                                    }
                                    style={{
                                      opacity: 0,
                                      width: 0,
                                      height: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      background: isOverride ? "#22c55e" : "#cbd5e1",
                                      borderRadius: "999px",
                                      transition: "background-color 0.2s ease",
                                    }}
                                  >
                                    <span
                                      style={{
                                        position: "absolute",
                                        top: "3px",
                                        left: isOverride ? "25px" : "3px",
                                        width: "20px",
                                        height: "20px",
                                        background: "#fff",
                                        borderRadius: "50%",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                        transition: "left 0.2s ease",
                                      }}
                                    />
                                  </span>
                                </label>

                                <span
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: isOverride ? "#16a34a" : "#64748b",
                                  }}
                                >
                                  {isOverride ? "Yes" : "No"}
                                </span>
                              </div>
                            );
                          }}
                        </Field>
                      </fieldset>
                    </div>

                    <div className="flex col">
                      {/* SUBMIT BUTTON */}
                      <button className="tf-button w208" type="submit">
                        {isEdit ? "Update Product" : "Create Product"}
                      </button>
                      <button type="button" className="ml-5 tf-button style-1">
                        <a href="/product" style={{ color: "inherit", textDecoration: "none" }}> Cancel</a>
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </div>

          {showCategoryModal && (
            <div
              className="modal-overlay"
              onClick={() => setShowCategoryModal(false)}
            >
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h5>Add New Category</h5>
                </div>

                <div className="modal-body">
                  <input
                    type="text"
                    className={`form-control model-form-control ${error ? "is-invalid" : ""}`}
                    placeholder="Category Name"
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      if (error) setError("");
                    }}
                  />

                  {error && <div className="invalid-feedback">{error}</div>}
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary cancel-btn"
                    onClick={() => setShowCategoryModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-primary save-btn"
                    disabled={!newCategory.trim()}
                    onClick={(e) => saveCategory(e)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {showBrandModel && (
            <div
              className="modal-overlay"
              onClick={() => setShowBrandModel(false)}
            >
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h5>Add New Brand</h5>
                </div>

                <div className="modal-body">
                  <input
                    type="text"
                    className={`form-control model-form-control ${error ? "is-invalid" : ""}`}
                    placeholder="Brand Name"
                    value={newBrand}
                    onChange={(e) => {
                      setNewBrand(e.target.value);
                      if (error) setError("");
                    }}
                  />

                  {error && <div className="invalid-feedback">{error}</div>}
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary cancel-btn"
                    onClick={() => setShowBrandModel(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-primary save-btn"
                    disabled={!newBrand.trim()}
                    onClick={(e) => saveBrand(e)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditProduct;
