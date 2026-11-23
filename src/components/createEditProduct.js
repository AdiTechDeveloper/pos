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
const MAX_IMAGES = 4;
const MAX_INFO_ROWS = 20;

// Input-level validation: reject invalid typing and pasted values.
const DECIMAL_INPUT_RE = /^\d*(?:\.\d{0,2})?$/;
const DIGITS_INPUT_RE = /^\d*$/;
const MAX_PRODUCT_AMOUNT = 999999.99;

const isValidDecimalInput = (value, max = MAX_PRODUCT_AMOUNT) =>
  value === "" ||
  (DECIMAL_INPUT_RE.test(value) &&
    value !== "." &&
    value.length <= 9 &&
    Number(value) <= max);

const isValidIntegerInput = (value, min = 0, max = 999999, allowEmpty = true) => {
  if (allowEmpty && value === "") return true;
  if (!DIGITS_INPUT_RE.test(value) || value.length > String(max).length) return false;
  const number = Number(value);
  return number >= min && number <= max;
};

const isAllowedProductName = (value) => /^[A-Za-z0-9 ]*$/.test(value);
const isAllowedSimpleName = (value) => /^[A-Za-z0-9 ]*$/.test(value);
const isAllowedSku = (value) => /^[A-Za-z0-9-]*$/.test(value);

// Product Information: filter values according to their selected label.
const normalizeInfoLabel = (label) => String(label || "").trim().toLowerCase();

const getInfoValuePattern = (label) => {
  const key = normalizeInfoLabel(label);
  if (key === "unit") return /^[A-Za-z0-9 .-]*$/;
  if (key === "shelf life") return /^\d{0,4}(?:\.\d{0,2})?(?:\s?(?:hours?|days?|weeks?|months?|years?))?$/i;
  if (key === "country of origin") return /^[A-Za-z ]{0,30}$/;
  if (key === "fssai license" || key === "seller fssai") return /^\d{0,14}$/;
  if (key === "customer care details") return /^[A-Za-z0-9+@().,\-:/ ]*$/;
  if (key === "nutrition information") return /^[A-Za-z0-9 %.,()/:-]*$/;
  if (key === "allergen information" || key === "ingredients") return /^[A-Za-z0-9 ,()./%:+-]*$/;
  if (key === "seller") return /^[A-Za-z0-9 ]*$/;
  return /^[A-Za-z0-9 ,.!?'"()/%:+&-]*$/;
};

const getInfoValueError = (label, value) => {
  const key = normalizeInfoLabel(label);
  const text = String(value || "").trim();
  if (!text) return "Value is required when a label is entered.";

  if (key === "unit" &&
      !/^(?:\d+(?:\.\d{1,2})?\s*)?(?:kg|g|mg|l|ml|pcs?|pieces?|units?|packs?|boxes?|bottles?|strips?|tablets?|capsules?|dozen|pair|set)$/i.test(text)) {
    return "Enter a valid unit such as 1 kg, 500 ml, 1 piece, or 1 pack.";
  }
  if (key === "shelf life" &&
      !/^\d{1,4}(?:\.\d{1,2})?\s?(?:hours?|days?|weeks?|months?|years?)$/i.test(text)) {
    return "Enter shelf life like 7 days, 6 months, or 1 year.";
  }
  if (key === "country of origin" && !/^[A-Za-z]{2,30}(?:[ -][A-Za-z]{1,30})*$/.test(text)) {
    return "Country name must contain 2–30 letters and spaces or hyphens only.";
  }
  if (key === "country of origin" && text.length > 30) {
    return "Country name cannot exceed 30 characters.";
  }
  if ((key === "fssai license" || key === "seller fssai") && !/^\d{14}$/.test(text)) {
    return "FSSAI license number must contain exactly 14 digits.";
  }
  if (key === "customer care details" &&
      !(/^[+]?\d[\d\s().-]{7,14}$/.test(text) ||
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text))) {
    return "Enter a valid customer care phone number or email address.";
  }
  if (key === "seller" && text.length < 2) {
    return "Seller name must contain at least 2 characters.";
  }
  return "";
};

const isValidInfoLabel = (value) => /^[A-Za-z0-9 ]*$/.test(value);



// Quick-add buttons
const INFO_SUGGESTIONS = [
  "Unit",
  "Shelf Life",
  "Storage Tips",
  "Country of Origin",
  "FSSAI License",
  "Nutrition Information",
  "Allergen Information",
  "Ingredients",
  "Taste Profile",
  "Return Policy",
  "Customer Care Details",
  "Seller",
  "Seller FSSAI",
  "Disclaimer",
];

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

  // Product images (max MAX_IMAGES)
  const fileInputRef = useRef(null);
  // server par abhi jo photos hain: [{ id, url, legacy? }]
  const [existingImages, setExistingImages] = useState([]);
  // naye chune hue (chhote kiye hue) files: [{ key, file, preview }]
  const [newImages, setNewImages] = useState([]);
  // save par server se hatane wali purani photos
  const [removedImages, setRemovedImages] = useState([]);
  const newImagesRef = useRef([]);
  const totalImages = existingImages.length + newImages.length;

  // Online store product details (Blinkit jaisi): [{ key, label, value }]
  const [infoRows, setInfoRows] = useState([]);
  const newInfoKey = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const addInfoRow = (label = "") => {
    setInfoRows((prev) =>
      prev.length >= MAX_INFO_ROWS
        ? prev
        : [...prev, { key: newInfoKey(), label, value: "" }],
    );
  };
  const updateInfoRow = (key, field, val) => {
    setInfoRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: val } : r)),
    );
  };
  const removeInfoRow = (key) => {
    setInfoRows((prev) => prev.filter((r) => r.key !== key));
  };

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
    description: "",
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
        // Naya API: product.images = [{id, url}]. Purana API: sirf product.image_url.
        let imgs = [];
        if (Array.isArray(product.images) && product.images.length) {
          imgs = product.images
            .map((img) => ({ id: img.id, url: img.url || img.image_url }))
            .filter((img) => img.url);
        } else if (product.image_url) {
          imgs = [{ id: null, url: product.image_url, legacy: true }];
        }
        setExistingImages(imgs.slice(0, MAX_IMAGES));
        setInfoRows(
          (Array.isArray(product.product_info) ? product.product_info : [])
            .slice(0, MAX_INFO_ROWS)
            .map((r) => ({
              key: newInfoKey(),
              label: r.label || "",
              value: r.value || "",
            })),
        );
        setNewImages([]);
        setRemovedImages([]);

        setInitialValues({
          sku: product.sku || "",
          name: product.name || "",
          description: product.description || "",
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
    newImagesRef.current = newImages;
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // wahi file dobara chunne par bhi onChange chale
    if (!files.length) return;

    const slots = MAX_IMAGES - totalImages;
    if (slots <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} images per product`);
      return;
    }
    if (files.length > slots) {
      toast.info(
        `Only ${slots} more image${slots > 1 ? "s" : ""} can be added. Extra files were skipped.`,
      );
    }

    const added = [];
    for (const file of files.slice(0, slots)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name}: please choose a JPG, PNG or WebP image`);
        continue;
      }
      if (file.size > MAX_PICK_MB * 1024 * 1024) {
        toast.error(`${file.name}: image is too large (max ${MAX_PICK_MB} MB)`);
        continue;
      }
      try {
        const small = await shrinkImage(file);
        added.push({
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: small,
          preview: URL.createObjectURL(small),
        });
      } catch (err) {
        toast.error(err.message || "Could not use this image");
      }
    }
    if (added.length) setNewImages((prev) => [...prev, ...added]);
  };

  const onRemoveExisting = (img) => {
    setExistingImages((prev) => prev.filter((i) => i !== img));
    setRemovedImages((prev) => [...prev, img]); // save par server se hategi
  };

  const onRemoveNew = (key) => {
    setNewImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((i) => i.key !== key);
    });
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
      .trim()
      .required("Product name is required")
      .min(3, "Product name must be at least 3 characters")
      .max(100, "Product name cannot exceed 100 characters")
      .matches(
        /^[A-Za-z0-9 ]+$/,
        "Product name can contain only letters, numbers and spaces",
      )
      .test(
        "not-only-spaces",
        "Product name cannot contain only spaces",
        (value) => !!value && value.trim().length > 0,
      ),

    hsn_code: Yup.string()
      .nullable()
      .transform((value) => (value?.trim() === "" ? null : value?.trim()))
      .matches(/^\d{8}$/, {
        message: "HSN code must contain exactly 8 digits",
        excludeEmptyString: true,
      }),

    barcode: Yup.string()
      .nullable()
      .transform((value) => (value?.trim() === "" ? null : value?.trim()))
      .matches(/^\d{13}$/, {
        message: "Barcode must contain exactly 13 digits",
        excludeEmptyString: true,
      }),

    sku: Yup.string()
      .nullable()
      .transform((value) => (value?.trim() === "" ? null : value?.trim()))
      .min(8, "SKU must be at least 8 characters")
      .max(12, "SKU cannot exceed 12 characters")
      .matches(
        /^[A-Za-z0-9-]+$/,
        "SKU can only contain letters, digits and hyphens",
      )
      .test(
        "not-only-spaces",
        "SKU cannot contain only spaces",
        (value) => !value || value.trim().length > 0,
      ),

    brand_id: Yup.string().required("Brand is required"),

    category_id: Yup.string().required("Category is required"),

    plu_code: Yup.string().when("sale_type", {
      is: "weight",
      then: (schema) =>
        schema
          .transform((value) => (value?.trim() === "" ? undefined : value))
          .required("PLU code is required for weight-type products")
          .matches(/^\d{5}$/, "PLU code must be exactly 5 digits"),
      otherwise: (schema) => schema.nullable(),
    }),

    mrp: Yup.number()
      .transform((value, originalValue) => originalValue === "" ? null : value)
      .nullable()
      .typeError("MRP must be a valid amount")
      .min(0, "MRP cannot be negative")
      .max(MAX_PRODUCT_AMOUNT, "MRP cannot exceed 999999.99"),

    selling_price: Yup.number()
      .transform((value, originalValue) => originalValue === "" ? null : value)
      .nullable()
      .typeError("Selling price must be a valid amount")
      .min(0, "Selling price cannot be negative")
      .max(MAX_PRODUCT_AMOUNT, "Selling price cannot exceed 999999.99"),

    cost_price: Yup.number()
      .transform((value, originalValue) => originalValue === "" ? null : value)
      .nullable()
      .typeError("Cost price must be a valid amount")
      .min(0, "Cost price cannot be negative")
      .max(MAX_PRODUCT_AMOUNT, "Cost price cannot exceed 999999.99"),

    price_per_kg: Yup.number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === null ? null : value,
      )
      .nullable()
      .when("sale_type", {
        is: "weight",
        then: (schema) =>
          schema
            .typeError("Price per kg must be a number")
            .required("Price per kg is required for weight-type products")
            .min(0.01, "Price per kg must be greater than 0")
            .max(MAX_PRODUCT_AMOUNT, "Price per kg cannot exceed 999999.99"),
        otherwise: (schema) => schema.nullable(),
      }),

    units_per_pack: Yup.number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue === null ? null : value,
      )
      .nullable()
      .typeError("Units per pack must be a number")
      .integer("Units per pack must be a whole number")
      .min(1, "Units per pack must be at least 1")
      .max(999999, "Units per pack cannot exceed 999999")
      .when("allow_loose", {
        is: true,
        then: (schema) =>
          schema
            .required("Units per pack is required for loose selling")
            .min(2, "Units per pack must be at least 2 for loose selling"),
      }),

    description: Yup.string().max(5000, "Description cannot exceed 5000 characters"),
  });

  const handleSubmit = async (values) => {
    try {
      const url = isEdit
        ? `${BASE_URL}/api/products/${id}`
        : `${BASE_URL}/api/products`;
      const method = isEdit ? "put" : "post";

      const payload = { ...values };
      payload.description = (values.description || "").trim();
      const invalidInfoRow = infoRows.find((r) => {
        const label = r.label.trim();
        const value = r.value.trim();
        if (r.label.length > 60 || r.value.length > 1500) return true;
        if (!label && !value) return false;
        if (!label || !value || !isValidInfoLabel(label)) return true;
        return Boolean(getInfoValueError(label, value));
      });
      if (invalidInfoRow) {
        const reason = getInfoValueError(invalidInfoRow.label, invalidInfoRow.value);
        throw new Error(
          reason ||
          "Each Product Information row needs a valid label and matching value. Check the field-specific format."
        );
      }
      payload.product_info = infoRows
        .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
        .filter((r) => r.label && r.value);
      if (hasFeature("pharmacy")) {
        payload.units_per_pack =
          payload.units_per_pack === "" ? null : payload.units_per_pack;
        payload.requires_prescription = !!payload.requires_prescription;
        payload.allow_loose = !!payload.allow_loose;
      } else {
        PHARMACY_KEYS.forEach((key) => delete payload[key]);
      }

      // Step 1: Save product details first.
      const productResponse = await axios({
        method,
        url,
        data: payload,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      const productId = isEdit ? id : productResponse.data?.product?.id;
      if (!productId) {
        throw new Error(
          "Product saved, but product ID was not returned by API.",
        );
      }

      const authHeaders = {
        Accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      };

      // Step 2: Hatayi gayi purani photos server se delete karo.
      for (const img of removedImages) {
        const deleteUrl = img.legacy
          ? `${BASE_URL}/api/products/${productId}/image`
          : `${BASE_URL}/api/products/${productId}/images/${img.id}`;
        const deleteResponse = await axios.delete(deleteUrl, {
          headers: authHeaders,
        });
        if (deleteResponse.data?.status === false) {
          throw new Error(
            deleteResponse.data.message || "Image removal failed",
          );
        }
      }
      setRemovedImages([]);

      // Step 3: Nayi photos ek saath upload karo (images[]).
      // Content-Type manually set mat karo; browser multipart boundary khud lagata hai.
      if (newImages.length) {
        const formData = new FormData();
        newImages.forEach((img, index) => {
          formData.append("images[]", img.file, `product-${index + 1}.jpg`);
        });

        const uploadResponse = await fetch(
          `${BASE_URL}/api/products/${productId}/images`,
          {
            method: "POST",
            headers: authHeaders,
            body: formData,
          },
        );

        const uploadData = await uploadResponse.json().catch(() => ({}));
        console.log(
          "Product image upload response:",
          uploadResponse.status,
          uploadData,
        );

        if (!uploadResponse.ok || uploadData.status === false) {
          throw new Error(
            uploadData.message ||
              uploadData.errors?.images?.[0] ||
              uploadData.errors?.["images.0"]?.[0] ||
              `Image upload failed (${uploadResponse.status})`,
          );
        }

        newImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setNewImages([]);
        if (Array.isArray(uploadData.images)) {
          setExistingImages(
            uploadData.images.map((img) => ({ id: img.id, url: img.url })),
          );
        }
      }

      appData?.invalidate("products");
      await appData?.loadProducts({ force: true });

      toast.success(isEdit ? "Product Updated!" : "Product Created!");
      navigate("/product");
    } catch (submitError) {
      console.error("Error saving product or image:", submitError);
      toast.error(
        submitError.response?.data?.message ||
          submitError.message ||
          "Failed to save product",
      );
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9 ]{3,50}$/.test(newCategory.trim())) {
      setError("Category name must be 3–50 characters and contain only letters, numbers and spaces.");
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
    if (!/^[A-Za-z0-9 ]{3,50}$/.test(newBrand.trim())) {
      setError("Brand name must be 3–50 characters and contain only letters, numbers and spaces.");
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
                          <Field name="name">
                            {({ field, form }) => (
                              <input
                                {...field}
                                type="text"
                                name="name"
                                maxLength={100}
                                placeholder="Enter product name"
                                className="mb-5"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (isAllowedProductName(value)) form.setFieldValue("name", value);
                                }}
                              />
                            )}
                          </Field>
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
                          <Field name="sku">
                            {({ field, form }) => (
                              <input
                                {...field}
                                type="text"
                                maxLength={12}
                                placeholder="Enter SKU"
                                className="mb-5"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (isAllowedSku(value)) form.setFieldValue("sku", value);
                                }}
                              />
                            )}
                          </Field>
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
                                            const value = e.target.value;
                                            if (/^\d{0,5}$/.test(value)) {
                                              form.setFieldValue("plu_code", value);
                                            }
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
                                    <Field name="price_per_kg">
                                      {({ field, form }) => (
                                        <input
                                          {...field}
                                          type="text"
                                          inputMode="decimal"
                                          maxLength={9}
                                          name="price_per_kg"
                                          placeholder="e.g. 40.00"
                                          className="mb-5"
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (isValidDecimalInput(value)) form.setFieldValue("price_per_kg", value);
                                          }}
                                        />
                                      )}
                                    </Field>
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
                            <Field name="units_per_pack">
                              {({ field, form }) => (
                                <input
                                  {...field}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  name="units_per_pack"
                                  placeholder="e.g. 10"
                                  className="mb-5"
                                  disabled={looseLocked && values.allow_loose}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (isValidIntegerInput(value, 1, 999999, true)) {
                                      form.setFieldValue("units_per_pack", value);
                                    }
                                  }}
                                />
                              )}
                            </Field>
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
                              fontSize: "16px",
                              fontWeight: "500",
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
                      <fieldset className="col-md-2">
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
                          <Field name="hsn_code">
                            {({ field, form }) => (
                              <input
                                {...field}
                                type="text"
                                inputMode="numeric"
                                maxLength={8}
                                placeholder="Enter HSN code"
                                className="mb-5"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (DIGITS_INPUT_RE.test(value)) form.setFieldValue("hsn_code", value);
                                }}
                              />
                            )}
                          </Field>
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
                                maxLength={13}
                                autoFocus
                                className="mb-5"
                                onChange={(e) => {
                                  const now = Date.now();
                                  const isScanner = now - lastTime < 30;
                                  lastTime = now;

                                  const value = e.target.value;
                                  if (!/^\d{0,13}$/.test(value)) return;
                                  form.setFieldValue("barcode", value);
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

                    {/* Product Images (max 4) */}
                    <div className="row mb-20">
                      <fieldset className="col-md-12">
                        <div className="body-title">
                          Product Images{" "}
                          <span style={{ fontWeight: 400, color: "#64748b" }}>
                            (up to {MAX_IMAGES}, shown on your online store)
                          </span>
                        </div>
                        <div className="body-content">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            onChange={onPickImages}
                            style={{ display: "none" }}
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: "12px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              ...existingImages.map((img) => ({
                                key: `old-${img.id ?? "legacy"}`,
                                src: img.url,
                                onRemove: () => onRemoveExisting(img),
                              })),
                              ...newImages.map((img) => ({
                                key: img.key,
                                src: img.preview,
                                onRemove: () => onRemoveNew(img.key),
                              })),
                            ].map((item, index) => (
                              <div
                                key={item.key}
                                style={{
                                  position: "relative",
                                  width: 120,
                                  height: 120,
                                  border: "2px solid #cbd5e1",
                                  borderRadius: 12,
                                  overflow: "hidden",
                                  background: "#f8fafc",
                                }}
                              >
                                <img
                                  src={item.src}
                                  alt={`Product ${index + 1}`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                                {index === 0 && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      left: 6,
                                      bottom: 6,
                                      background: "rgba(15,23,42,0.75)",
                                      color: "#fff",
                                      fontSize: 11,
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                    }}
                                  >
                                    Main
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={item.onRemove}
                                  aria-label="Remove image"
                                  style={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    width: 24,
                                    height: 24,
                                    lineHeight: "22px",
                                    padding: 0,
                                    border: "none",
                                    borderRadius: "50%",
                                    background: "rgba(15,23,42,0.75)",
                                    color: "#fff",
                                    fontSize: 16,
                                    cursor: "pointer",
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}

                            {totalImages < MAX_IMAGES && (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                  width: 120,
                                  height: 120,
                                  border: "2px dashed #cbd5e1",
                                  borderRadius: 12,
                                  background: "#f8fafc",
                                  color: "#64748b",
                                  cursor: "pointer",
                                  fontSize: 13,
                                }}
                              >
                                <div style={{ fontSize: 28, lineHeight: 1 }}>
                                  +
                                </div>
                                Add Image
                              </button>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 8,
                            }}
                          >
                            {totalImages}/{MAX_IMAGES} images. JPG, PNG or WebP,
                            resized to 800px automatically. First image is the
                            main one. A square photo looks best.
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    {/* Product Details for online store (Blinkit jaisa) */}
                    <div className="row mb-20">
                      <fieldset className="col-md-12">
                        <div className="body-title">
                          Description{" "}
                          <span style={{ fontWeight: 400, color: "#64748b" }}>
                            (shown on your online store)
                          </span>
                        </div>
                        <div className="body-content">
                          <Field
                            as="textarea"
                            name="description"
                            rows={4}
                            maxLength={500}
                            placeholder="e.g. Rich and creamy full cream milk, an excellent source of vitamin A and D..."
                            className="mb-5"
                          />
                        </div>
                      </fieldset>

                      <fieldset className="col-md-12">
                        <div className="body-title">
                          Product Information{" "}
                          <span style={{ fontWeight: 400, color: "#64748b" }}>
                            (up to {MAX_INFO_ROWS} rows, optional)
                          </span>
                        </div>
                        <div className="body-content">
                          <datalist id="info-label-suggestions">
                            {INFO_SUGGESTIONS.map((label) => (
                              <option key={label} value={label} />
                            ))}
                          </datalist>

                          {infoRows.map((row) => (
                            <div
                              key={row.key}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                marginBottom: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <input
                                type="text"
                                list="info-label-suggestions"
                                value={row.label}
                                maxLength={60}
                                placeholder="Label (e.g. Shelf Life)"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (isValidInfoLabel(value)) {
                                    updateInfoRow(row.key, "label", value);
                                    // Clear an old value if it does not match the newly selected information type.
                                    if (!getInfoValuePattern(value).test(row.value)) {
                                      updateInfoRow(row.key, "value", "");
                                    }
                                  }
                                }}
                                style={{ flex: "1 1 200px", minWidth: 160 }}
                              />
                              <textarea
                                rows={2}
                                value={row.value}
                                maxLength={normalizeInfoLabel(row.label) === "country of origin" ? 30 : 1500}
                                placeholder={normalizeInfoLabel(row.label) === "country of origin" ? "Country name (e.g. India)" : "Value (e.g. 2 days)"}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const pattern = getInfoValuePattern(row.label);
                                  if (pattern.test(value)) {
                                    updateInfoRow(row.key, "value", value);
                                  }
                                }}
                                style={{ flex: "3 1 320px", minWidth: 200 }}
                              />
                              {normalizeInfoLabel(row.label) === "fssai license" ||
                              normalizeInfoLabel(row.label) === "seller fssai" ? (
                                <small style={{ color: "#64748b", width: "100%" }}>Enter exactly 14 digits.</small>
                              ) : normalizeInfoLabel(row.label) === "shelf life" ? (
                                <small style={{ color: "#64748b", width: "100%" }}>Example: 7 days, 6 months, 1 year.</small>
                              ) : normalizeInfoLabel(row.label) === "unit" ? (
                                <small style={{ color: "#64748b", width: "100%" }}>Example: 1 kg, 500 ml, 1 piece.</small>
                              ) : normalizeInfoLabel(row.label) === "country of origin" ? (
                                <small style={{ color: "#64748b", width: "100%" }}>Enter a country name, e.g. India.</small>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => removeInfoRow(row.key)}
                                aria-label="Remove row"
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 8,
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: 18,
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          {infoRows.length < MAX_INFO_ROWS && (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                marginTop: 6,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => addInfoRow("")}
                                style={{
                                  padding: "4px 12px",
                                  border: "1px dashed #94a3b8",
                                  borderRadius: 999,
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: 13,
                                }}
                              >
                                + Add row
                              </button>
                              {INFO_SUGGESTIONS.filter(
                                (label) =>
                                  !infoRows.some(
                                    (r) =>
                                      r.label.trim().toLowerCase() ===
                                      label.toLowerCase(),
                                  ),
                              ).map((label) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => addInfoRow(label)}
                                  style={{
                                    padding: "4px 12px",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 999,
                                    background: "#f8fafc",
                                    color: "#475569",
                                    cursor: "pointer",
                                    fontSize: 13,
                                  }}
                                >
                                  + {label}
                                </button>
                              ))}
                            </div>
                          )}
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
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isAllowedSimpleName(value)) setNewCategory(value);
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
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isAllowedSimpleName(value)) setNewBrand(value);
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
