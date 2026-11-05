import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";
import ProductImport from "./ProductImport";
import { hasFeature } from "../utils/hasFeature";

const MAX_IMAGE_SIDE = 800;
const MAX_PICK_MB = 10;

const shrinkImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(
        1,
        MAX_IMAGE_SIDE / Math.max(img.width, img.height),
      );
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(new File([blob], "product.jpg", { type: "image/jpeg" }))
            : reject(new Error("Could not process this image")),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file is not a valid image"));
    };
    img.src = url;
  });

const CreateEditProduct = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams(); // if id exists -> Edit Mode
  const navigate = useNavigate();
  const appData = useAppData();

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_product = localStorage.getItem("product_detail");

  const incomingProduct = store_product && JSON.parse(store_product);
  const isEdit = Boolean(id);

  const brands = appData?.brands || [];
  const categories = appData?.categories || [];
  const gstRates = appData?.gstRates || [];

  const [barcode, setBarcode] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [brandId, setBrandId] = useState("");
  const [showBrandModel, setShowBrandModel] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [error, setError] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  // true when the product already has purchase / sales history (loose selling can no longer change)
  const [looseLocked, setLooseLocked] = useState(false);

  // Product image
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null); // naya chuna hua (chhota kiya hua) file
  const [imagePreview, setImagePreview] = useState(""); // dikhne wali photo: server ka URL ya naye file ka blob URL
  const [serverImage, setServerImage] = useState(""); // abhi server par jo photo hai
  const [removeImage, setRemoveImage] = useState(false);

  const PHARMACY_KEYS = [
    "salt_composition",
    "drug_schedule",
    "requires_prescription",
    "pack_type",
    "units_per_pack",
    "allow_loose",
    "loose_unit",
  ];

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
    sale_type: "unit",
    plu_code: "",
    price_per_kg: "",
    salt_composition: "",
    drug_schedule: "none",
    requires_prescription: false,
    pack_type: "",
    units_per_pack: "",
    allow_loose: false,
    loose_unit: "tablet",
  });

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
        setServerImage(product.image_url || "");
        setImagePreview(product.image_url || "");

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
          sale_type: product.sale_type || "unit",
          plu_code: product.plu_code || "",
          price_per_kg: product.price_per_kg || "",
          salt_composition: product.salt_composition || "",
          drug_schedule: product.drug_schedule || "none",
          requires_prescription: product.requires_prescription == 1,
          pack_type: product.pack_type || "",
          units_per_pack: product.units_per_pack || "",
          allow_loose: product.allow_loose == 1,
          loose_unit: product.loose_unit || "tablet",
        });
        setLooseLocked(Boolean(response.data.loose_locked));
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to fetch product");
    } finally {
      setLoadingProduct(false);
    }
  };

  // Blob URL band karo, warna memory bhari rehti hai
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // wahi file dobara chunne par bhi onChange chale
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > MAX_PICK_MB * 1024 * 1024) {
      toast.error(`Image is too large (max ${MAX_PICK_MB} MB)`);
      return;
    }

    try {
      const small = await shrinkImage(file);
      setImageFile(small);
      setImagePreview(URL.createObjectURL(small));
      setRemoveImage(false);
    } catch (err) {
      toast.error(err.message || "Could not use this image");
    }
  };

  const onRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(Boolean(serverImage)); // server par photo thi to save par hatao
  };

  useEffect(() => {
    appData?.loadBrands();
    appData?.loadCategories();
    appData?.loadGstRates();

    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const validationSchema = Yup.object({
    name: Yup.string()
      .required("Name is required")
      .min(3, "Name must be at least 3 characters") // Changed from 2 to 3 to catch 2-letter names
      .max(100, "Name cannot exceed 100 characters"),

    sku: Yup.string()
      .min(8, "SKU must be at least 8 letter long.")
      .max(12, "SKU cannot exceed 12 characters"),
    brand_id: Yup.string().required("Brand is required"),
    category_id: Yup.string().required("Category  is required"),
    plu_code: Yup.string().when("sale_type", {
      is: "weight",
      then: (schema) =>
        schema
          .required("PLU code is required for weight-type products")
          .matches(/^\d{5}$/, "PLU code must be exactly 5 digits"),
      otherwise: (schema) => schema.nullable(),
    }),
    price_per_kg: Yup.number().when("sale_type", {
      is: "weight",
      then: (schema) =>
        schema
          .required("Price per kg is required for weight-type products")
          .min(0.01, "Price per kg must be greater than 0"),
      otherwise: (schema) => schema.nullable(),
    }),
    units_per_pack: Yup.number()
      .transform((value, original) => (original === "" ? null : value))
      .nullable()
      .integer("Must be a whole number")
      .min(1, "Must be at least 1")
      .when("allow_loose", {
        is: true,
        then: (schema) =>
          schema
            .required("Units per pack is required for loose selling")
            .min(2, "Must be at least 2 for loose selling"),
      }),
  });

  const handleSubmit = async (values) => {
    try {
      let url = "";
      let method = "";

      if (isEdit) {
        url = `${BASE_URL}/api/products/${id}`;
        method = "put";
      } else {
        url = `${BASE_URL}/api/products`;
        method = "post";
      }

      const payload = { ...values };
      if (hasFeature("pharmacy")) {
        payload.units_per_pack =
          payload.units_per_pack === "" ? null : payload.units_per_pack;
        payload.requires_prescription = !!payload.requires_prescription;
        payload.allow_loose = !!payload.allow_loose;
      } else {
        PHARMACY_KEYS.forEach((k) => delete payload[k]);
      }

      const res = await axios({
        method,
        url,
        data: payload,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      // Photo alag request se jaati hai (file JSON mein nahi bheji ja sakti). Product pehle save ho chuka hai.
      const productId = isEdit ? id : res.data?.product?.id;
      let imageFailed = false;
      try {
        const imgHeaders = {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        };
        if (imageFile && productId) {
          const fd = new FormData();
          fd.append("image", imageFile);
          await axios.post(`${BASE_URL}/api/products/${productId}/image`, fd, {
            headers: imgHeaders,
          });
        } else if (removeImage && isEdit) {
          await axios.delete(`${BASE_URL}/api/products/${productId}/image`, {
            headers: imgHeaders,
          });
        }
      } catch (imgErr) {
        imageFailed = true;
        console.error("Error saving product image:", imgErr);
        toast.error(
          imgErr.response?.data?.message ||
            "Product saved, but the image could not be uploaded. Edit the product to try again.",
        );
      }

      appData?.invalidate("products");
      await appData?.loadProducts();

      if (!imageFailed) {
        toast.success(isEdit ? "Product Updated!" : "Product Created!");
      }

      navigate("/product");
    } catch (error) {
      console.error("Error saving product:", error);

      toast.error(error.response?.data?.message || "Failed to save product");
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
    setShowCategoryModal(false);

    appData?.invalidate("categories");
    await appData?.loadCategories();
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
    setShowBrandModel(false);

    appData?.invalidate("brands");
    await appData?.loadBrands();
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">
            {isEdit ? "Edit Product" : "Create Product"}
          </h3>
          {!isEdit && (
            <ProductImport
              onImported={async () => {
                appData?.invalidate("products");
                await appData?.loadProducts({ force: true });
              }}
            />
          )}
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
                {({ values, setFieldValue }) => (
                  <Form className="wg-form">
                    <div className="row mb-20 col-12">
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

                      <fieldset className="col-md-3">
                        <div className="body-title">SKU</div>
                        <div className="body-content mb-15">
                          <Field
                            type="text"
                            name="sku"
                            placeholder="Enter SKU"
                            className="mb-5"
                            maxlength={12}
                          />
                          <ErrorMessage
                            name="sku"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </fieldset>

                      <fieldset className="col-md-3 mb-15">
                        <div className="body-title">
                          {" "}
                          {hasFeature("pharmacy")
                            ? "Manufacturer / Company *"
                            : "Brand *"}
                        </div>
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
                        <div className="body-title">
                          {hasFeature("pharmacy")
                            ? "Medicine Category *"
                            : "Category *"}
                        </div>
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

                    {/* Sale Type / Weight fields (pharmacy stores do not need this) */}
                    {!hasFeature("pharmacy") && (
                      <div className="row mb-20">
                        <fieldset className="col-md-3">
                          <div className="body-title">Sale Type</div>
                          <div className="body-content">
                            <Field
                              name="sale_type"
                              as="select"
                              className="mb-5"
                            >
                              <option value="unit">Unit (piece/box)</option>
                              <option value="weight">
                                Weight (kg - loose item)
                              </option>
                            </Field>
                            <ErrorMessage
                              name="sale_type"
                              className="error-text"
                              component="div"
                            />
                          </div>
                        </fieldset>

                        <Field name="sale_type">
                          {({ field }) =>
                            field.value === "weight" && (
                              <>
                                <fieldset className="col-md-3">
                                  <div className="body-title">PLU Code *</div>
                                  <div className="body-content">
                                    <Field name="plu_code">
                                      {({ field, form }) => (
                                        <input
                                          {...field}
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="e.g. 00123"
                                          maxLength={5}
                                          className="mb-5"
                                          onChange={(e) => {
                                            const onlyDigits = e.target.value
                                              .replace(/\D/g, "")
                                              .slice(0, 5);
                                            form.setFieldValue(
                                              "plu_code",
                                              onlyDigits,
                                            );
                                          }}
                                        />
                                      )}
                                    </Field>
                                    <ErrorMessage
                                      name="plu_code"
                                      className="error-text"
                                      component="div"
                                    />
                                  </div>
                                </fieldset>

                                <fieldset className="col-md-3">
                                  <div className="body-title">
                                    Price per Kg (₹) *
                                  </div>
                                  <div className="body-content">
                                    <Field
                                      type="number"
                                      step="0.01"
                                      name="price_per_kg"
                                      placeholder="e.g. 40.00"
                                      className="mb-5"
                                    />
                                    <ErrorMessage
                                      name="price_per_kg"
                                      className="error-text"
                                      component="div"
                                    />
                                  </div>
                                </fieldset>
                              </>
                            )
                          }
                        </Field>
                      </div>
                    )}

                    {hasFeature("pharmacy") && (
                      <div className="row mb-20">
                        <fieldset className="col-md-3">
                          <div className="body-title">Drug Schedule</div>
                          <div className="body-content">
                            <Field
                              as="select"
                              name="drug_schedule"
                              className="mb-5"
                              onChange={(e) => {
                                const v = e.target.value;
                                setFieldValue("drug_schedule", v);
                                if (["H", "H1", "X"].includes(v)) {
                                  setFieldValue("requires_prescription", true);
                                }
                              }}
                            >
                              <option value="none">None (OTC)</option>
                              <option value="G">Schedule G</option>
                              <option value="H">Schedule H</option>
                              <option value="H1">Schedule H1</option>
                              <option value="X">Schedule X</option>
                            </Field>
                          </div>
                        </fieldset>

                        <fieldset className="col-md-3">
                          <div className="body-title">Salt / Composition</div>
                          <div className="body-content">
                            <Field
                              type="text"
                              name="salt_composition"
                              placeholder="e.g. Paracetamol 500mg"
                              className="mb-5"
                            />
                          </div>
                        </fieldset>

                        <fieldset className="col-md-3">
                          <div className="body-title">Pack Type</div>
                          <div className="body-content">
                            <Field
                              as="select"
                              name="pack_type"
                              className="mb-5"
                            >
                              <option value="">Select</option>
                              <option value="strip">Strip</option>
                              <option value="bottle">Bottle</option>
                              <option value="tube">Tube</option>
                              <option value="box">Box</option>
                              <option value="vial">Vial</option>
                              <option value="sachet">Sachet</option>
                            </Field>
                          </div>
                        </fieldset>

                        <fieldset className="col-md-3">
                          <div className="body-title">Units per Pack</div>
                          <div className="body-content">
                            <Field
                              type="number"
                              min="1"
                              name="units_per_pack"
                              placeholder="e.g. 10"
                              className="mb-5"
                              disabled={looseLocked && values.allow_loose}
                            />
                            <ErrorMessage
                              name="units_per_pack"
                              className="error-text"
                              component="div"
                            />
                          </div>
                        </fieldset>

                        <fieldset className="col-md-3">
                          <div className="body-title mb-5">
                            Prescription Required
                          </div>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Field
                              type="checkbox"
                              name="requires_prescription"
                              disabled={["H", "H1", "X"].includes(
                                values.drug_schedule,
                              )}
                            />
                            <span>
                              {["H", "H1", "X"].includes(values.drug_schedule)
                                ? "Always required for this schedule"
                                : "Yes"}
                            </span>
                          </label>
                        </fieldset>

                        <fieldset className="col-md-3">
                          <div className="body-title mb-5">
                            Allow Loose Selling
                          </div>
                          <Field name="allow_loose">
                            {({ field, form }) => {
                              const isOn =
                                field.value === true || field.value === 1;

                              return (
                                <div>
                                  <label
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "12px",
                                      minHeight: "44px",
                                      cursor: looseLocked
                                        ? "not-allowed"
                                        : "pointer",
                                      opacity: looseLocked ? 0.6 : 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        position: "relative",
                                        display: "inline-block",
                                        width: "56px",
                                        height: "30px",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isOn}
                                        disabled={looseLocked}
                                        onChange={() =>
                                          form.setFieldValue(
                                            "allow_loose",
                                            !isOn,
                                          )
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
                                          inset: 0,
                                          background: isOn
                                            ? "#22c55e"
                                            : "#cbd5e1",
                                          borderRadius: "999px",
                                          transition:
                                            "background-color 0.2s ease",
                                        }}
                                      >
                                        <span
                                          style={{
                                            position: "absolute",
                                            top: "3px",
                                            left: isOn ? "29px" : "3px",
                                            width: "24px",
                                            height: "24px",
                                            background: "#fff",
                                            borderRadius: "50%",
                                            boxShadow:
                                              "0 1px 3px rgba(0,0,0,0.3)",
                                            transition: "left 0.2s ease",
                                          }}
                                        />
                                      </span>
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        color: isOn ? "#16a34a" : "#64748b",
                                      }}
                                    >
                                      {isOn ? "Yes" : "No"}
                                    </span>
                                  </label>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      marginTop: 4,
                                      color: looseLocked
                                        ? "#b45309"
                                        : "#64748b",
                                    }}
                                  >
                                    {looseLocked
                                      ? "Locked: this product already has purchase or sales history."
                                      : "Sell single tablets / capsules from a strip. Stock is then tracked in single units."}
                                  </div>
                                </div>
                              );
                            }}
                          </Field>
                        </fieldset>

                        {values.allow_loose && (
                          <fieldset className="col-md-3">
                            <div className="body-title">Loose Unit</div>
                            <div className="body-content">
                              <Field
                                as="select"
                                name="loose_unit"
                                className="mb-5"
                                disabled={looseLocked}
                              >
                                <option value="tablet">Tablet</option>
                                <option value="capsule">Capsule</option>
                                <option value="piece">Piece</option>
                                <option value="ml">ml</option>
                              </Field>
                              <div style={{ fontSize: 12, color: "#64748b" }}>
                                1 {values.pack_type || "pack"} ={" "}
                                {values.units_per_pack || "?"}{" "}
                                {values.loose_unit || "tablet"}
                              </div>
                            </div>
                          </fieldset>
                        )}
                      </div>
                    )}

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
                            const isIncluded =
                              field.value === true || field.value === 1;

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
                                      form.setFieldValue(
                                        "gst_inclusive",
                                        !isIncluded,
                                      )
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
                                      background: isIncluded
                                        ? "#22c55e"
                                        : "#cbd5e1",
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
                        <div className="body-title mb-5">
                          Allow Change Price
                        </div>

                        <Field name="is_price_override">
                          {({ field, form }) => {
                            const isOverride =
                              field.value === true || field.value === 1;

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
                                      form.setFieldValue(
                                        "is_price_override",
                                        !isOverride,
                                      )
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
                                      background: isOverride
                                        ? "#22c55e"
                                        : "#cbd5e1",
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

                    {/* Product Image */}
                    <div className="row mb-20">
                      <fieldset className="col-md-12">
                        <div className="body-title">
                          Product Image{" "}
                          <span style={{ fontWeight: 400, color: "#64748b" }}>
                            (shown on your online store)
                          </span>
                        </div>
                        <div
                          className="body-content"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              width: 120,
                              height: 120,
                              flexShrink: 0,
                              border: "2px dashed #cbd5e1",
                              borderRadius: 12,
                              overflow: "hidden",
                              display: "grid",
                              placeItems: "center",
                              background: "#f8fafc",
                            }}
                          >
                            {imagePreview ? (
                              <img
                                src={imagePreview}
                                alt="Product"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#94a3b8",
                                  textAlign: "center",
                                  padding: 8,
                                }}
                              >
                                No image
                              </span>
                            )}
                          </div>

                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={onPickImage}
                              style={{ display: "none" }}
                            />
                            <button
                              type="button"
                              className="tf-button style-1"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {imagePreview ? "Change Image" : "Upload Image"}
                            </button>
                            {imagePreview && (
                              <button
                                type="button"
                                className="tf-button style-1 ml-5"
                                onClick={onRemoveImage}
                              >
                                Remove
                              </button>
                            )}
                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                marginTop: 8,
                              }}
                            >
                              JPG, PNG or WebP. Resized to 800px automatically.
                              A square photo looks best.
                            </div>
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    <div className="flex col">
                      <button className="tf-button w208" type="submit">
                        {isEdit ? "Update Product" : "Create Product"}
                      </button>
                      <button type="button" className="ml-5 tf-button style-1">
                        <a
                          href="/product"
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
