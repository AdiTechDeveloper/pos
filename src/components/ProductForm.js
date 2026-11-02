import React, { useEffect, useState } from "react";
import axios from "axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { hasFeature } from "../utils/hasFeature";

const ProductForm = ({ onSuccess, onCancel, initialData = null }) => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const isEdit = Boolean(initialData?.id);

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [loading, setLoading] = useState(false);

  const PHARMACY_KEYS = [
    "salt_composition",
    "drug_schedule",
    "requires_prescription",
    "pack_type",
    "units_per_pack",
  ];

  let lastTime = 0;

  const initialValues = {
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    brand_id: initialData?.brand_id || "",
    category_id: initialData?.category_id || "",
    hsn_code: initialData?.hsn_code || "",
    gst_rate_id: initialData?.gst_rate_id || "",
    barcode: initialData?.barcode || "",
    gst_inclusive: initialData?.gst_inclusive == 1 || false,
    is_price_override: initialData?.is_price_override ? 1 : 0,
    sale_type: initialData?.sale_type || "unit",
    plu_code: initialData?.plu_code || "",
    price_per_kg: initialData?.price_per_kg || "",
    salt_composition: initialData?.salt_composition || "",
    drug_schedule: initialData?.drug_schedule || "none",
    requires_prescription: initialData?.requires_prescription == 1,
    pack_type: initialData?.pack_type || "",
    units_per_pack: initialData?.units_per_pack || "",
  };

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${user_data.token}` };
      try {
        const [bRes, cRes, gRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/brands`, { headers }),
          axios.get(`${BASE_URL}/api/categories`, { headers }),
          axios.get(`${BASE_URL}/api/gst-rates`, { headers }),
        ]);
        setBrands(bRes.data.brands || []);
        setCategories(cRes.data.categories || []);
        setGstRates(gRes.data.gstRates || []);
      } catch (err) {
        toast.error("Error loading form data");
      }
    };
    fetchData();
  }, [BASE_URL, user_data.token]);

  const validationSchema = Yup.object({
    name: Yup.string().required("Product Name is required"),
    brand_id: Yup.string().required("Required"),
    category_id: Yup.string().required("Required"),
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
      .min(1, "Must be at least 1"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const url = isEdit
        ? `${BASE_URL}/api/products/${initialData.id}`
        : `${BASE_URL}/api/products`;

      const payload = { ...values };
      if (hasFeature("pharmacy")) {
        payload.units_per_pack =
          payload.units_per_pack === "" ? null : payload.units_per_pack;
        payload.requires_prescription = !!payload.requires_prescription;
      } else {
        PHARMACY_KEYS.forEach((k) => delete payload[k]);
      }

      const response = await axios({
        method: isEdit ? "put" : "post",
        url,
        data: payload,
        headers: { Authorization: `Bearer ${user_data.token}` },
      });

      toast.success(isEdit ? "Product Updated!" : "Product Created!");

      const savedProduct = response.data.product || response.data;

      onSuccess?.(savedProduct);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSave = async (setFieldValue) => {
    if (quickAddValue.trim().length < 3) return toast.warning("Too short");
    setLoading(true);
    try {
      const endpoint = modalType === "brand" ? "brands" : "categories";
      const res = await axios.post(
        `${BASE_URL}/api/${endpoint}`,
        { name: quickAddValue.trim() },
        { headers: { Authorization: `Bearer ${user_data.token}` } },
      );
      const newItem = res.data.brand || res.data.category || res.data;
      if (modalType === "brand") {
        setBrands([...brands, newItem]);
        setFieldValue("brand_id", newItem.id);
      } else {
        setCategories([...categories, newItem]);
        setFieldValue("category_id", newItem.id);
      }
      setModalType(null);
      setQuickAddValue("");
    } catch (err) {
      toast.error("Add failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue, values }) => (
          <Form className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  Product Name *
                </label>
                <Field
                  name="name"
                  placeholder="Product Name"
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <ErrorMessage
                  name="name"
                  component="div"
                  className="text-red-500 text-[10px]"
                />
              </div>

              {/* SKU */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  SKU Code
                </label>
                <Field
                  name="sku"
                  placeholder="SKU-001"
                  className="px-4 py-2 border border-gray-200 rounded-lg outline-none"
                />
              </div>

              {/* Brand */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  {hasFeature("pharmacy")
                    ? "Manufacturer / Company *"
                    : "Brand *"}
                </label>
                <div className="flex gap-2">
                  <Field
                    as="select"
                    name="brand_id"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Field>
                  <button
                    type="button"
                    onClick={() => setModalType("brand")}
                    className="p-2 border border-indigo-100 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  {hasFeature("pharmacy")
                    ? "Medicine Category *"
                    : "Category *"}
                </label>
                <div className="flex gap-2">
                  <Field
                    as="select"
                    name="category_id"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Field>
                  <button
                    type="button"
                    onClick={() => setModalType("category")}
                    className="p-2 border border-indigo-100 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* GST Rate */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  GST Rate (%)
                </label>
                <Field
                  as="select"
                  name="gst_rate_id"
                  className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                >
                  <option value="">No GST</option>
                  {gstRates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.rate}%
                    </option>
                  ))}
                </Field>
              </div>

              {/* HSN */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  HSN Code
                </label>
                <Field
                  name="hsn_code"
                  placeholder="123456"
                  className="px-4 py-2 border border-gray-200 rounded-lg outline-none"
                />
              </div>

              {/* Barcode */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  Barcode
                </label>
                <fieldset className="col-md-12">
                  <div className="body-content mb-15">
                    <Field name="barcode">
                      {({ field, form }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="Scan Barcode"
                          autoFocus
                          className="mb-5"
                          autoComplete="off"
                          onChange={(e) => {
                            const now = Date.now();
                            const isScanner =
                              now - (window.lastBarcodeTime || 0) < 30;
                            window.lastBarcodeTime = now;

                            form.setFieldValue("barcode", e.target.value);
                            form.setFieldTouched("barcode", true, false);

                            if (isScanner) {
                              form.setFieldValue("_scanner", true, false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();

                              const barcodeValue = field.value?.trim();
                              if (!barcodeValue) return;

                              form.setFieldValue("_scanner", false, false);
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
              </div>

              {/* GST Toggle */}
              <div className="flex flex-col justify-end mb-20">
                <Field name="gst_inclusive">
                  {({ field, form }) => {
                    const isIncluded =
                      field.value === true || field.value === 1;

                    return (
                      <div className="flex gap-3">
                        {/* GST Included */}
                        <label
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            isIncluded
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-indigo-600"
                            checked={isIncluded}
                            onChange={() =>
                              form.setFieldValue("gst_inclusive", true)
                            }
                          />

                          <span className="text-[10px] font-bold text-gray-600">
                            GST INCLUSIVE
                          </span>
                        </label>

                        {/* GST Excluded */}
                        <label
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            !isIncluded
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-indigo-600"
                            checked={!isIncluded}
                            onChange={() =>
                              form.setFieldValue("gst_inclusive", false)
                            }
                          />

                          <span className="text-[10px] font-bold text-gray-600">
                            GST EXCLUSIVE
                          </span>
                        </label>
                      </div>
                    );
                  }}
                </Field>
              </div>

              {/* Price Override */}
              <div className="flex flex-col justify-end mb-20">
                <Field name="is_price_override">
                  {({ field, form }) => {
                    const isOverride =
                      field.value === true || field.value === 1;

                    return (
                      <div className="flex gap-3">
                        {/* GST Included */}
                        <label
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            isOverride
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-indigo-600"
                            checked={isOverride}
                            onChange={() =>
                              form.setFieldValue("is_price_override", true)
                            }
                          />

                          <span className="text-[10px] font-bold text-gray-600">
                            Price Override
                          </span>
                        </label>

                        {/* GST Excluded */}
                        <label
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            !isOverride
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-indigo-600"
                            checked={!isOverride}
                            onChange={() =>
                              form.setFieldValue("is_price_override", false)
                            }
                          />

                          <span className="text-[10px] font-bold text-gray-600">
                            Price Not Override
                          </span>
                        </label>
                      </div>
                    );
                  }}
                </Field>
              </div>
            </div>

            {/* Sale Type / Weight fields (pharmacy stores do not need this) */}
            {!hasFeature("pharmacy") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                    Sale Type
                  </label>
                  <Field
                    as="select"
                    name="sale_type"
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                  >
                    <option value="unit">Unit (piece/box)</option>
                    <option value="weight">Weight (kg - loose item)</option>
                  </Field>
                </div>

                {values.sale_type === "weight" && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                        PLU Code *
                      </label>
                      <Field name="plu_code">
                        {({ field, form }) => (
                          <input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 00123"
                            maxLength={5}
                            autoComplete="off"
                            className="px-4 py-2 border border-gray-200 rounded-lg outline-none"
                            onChange={(e) =>
                              form.setFieldValue(
                                "plu_code",
                                e.target.value.replace(/\D/g, "").slice(0, 5),
                              )
                            }
                          />
                        )}
                      </Field>
                      <ErrorMessage
                        name="plu_code"
                        component="div"
                        className="text-red-500 text-[10px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                        Price per Kg (₹) *
                      </label>
                      <Field
                        type="number"
                        step="0.01"
                        name="price_per_kg"
                        placeholder="e.g. 40.00"
                        className="px-4 py-2 border border-gray-200 rounded-lg outline-none"
                      />
                      <ErrorMessage
                        name="price_per_kg"
                        component="div"
                        className="text-red-500 text-[10px]"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {hasFeature("pharmacy") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                    Drug Schedule
                  </label>
                  <Field
                    as="select"
                    name="drug_schedule"
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFieldValue("drug_schedule", v);
                      if (["H", "H1", "X"].includes(v))
                        setFieldValue("requires_prescription", true);
                    }}
                  >
                    <option value="none">None (OTC)</option>
                    <option value="G">Schedule G</option>
                    <option value="H">Schedule H</option>
                    <option value="H1">Schedule H1</option>
                    <option value="X">Schedule X</option>
                  </Field>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                    Salt / Composition
                  </label>
                  <Field
                    name="salt_composition"
                    placeholder="e.g. Paracetamol 500mg"
                    className="px-4 py-2 border border-gray-200 rounded-lg outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                    Pack Type
                  </label>
                  <Field
                    as="select"
                    name="pack_type"
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
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

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                    Units per Pack
                  </label>
                  <Field
                    type="number"
                    min="1"
                    name="units_per_pack"
                    placeholder="e.g. 10"
                    className="px-4 py-2 border border-gray-200 rounded-lg outline-none"
                  />
                  <ErrorMessage
                    name="units_per_pack"
                    component="div"
                    className="text-red-500 text-[10px]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                    Prescription Required
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <Field
                      type="checkbox"
                      name="requires_prescription"
                      className="w-4 h-4 accent-indigo-600"
                      disabled={["H", "H1", "X"].includes(values.drug_schedule)}
                    />
                    <span className="text-sm text-gray-600">
                      {["H", "H1", "X"].includes(values.drug_schedule)
                        ? "Always required for this schedule"
                        : "Yes"}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 text-sm font-bold text-gray-400 text-xl hover:text-white-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xl text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50 transition-all hover:text-white"
              >
                {isSubmitting
                  ? "..."
                  : isEdit
                    ? "Update Product"
                    : "Save Product"}
              </button>
            </div>

            {modalType && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[3px]">
                <div className="bg-white rounded-2xl shadow-2xl w-full md:max-w-4xl p-8 border border-gray-100 animate-in fade-in zoom-in duration-200">
                  <div className="mb-6">
                    <h4 className="font-bold text-3xl text-gray-800 tracking-tight">
                      Add New{" "}
                      {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                    </h4>
                    <p className="text-gray-500 text-2xl">
                      Enter the name for the new {modalType} to add it to your
                      list.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-2xl font-bold text-gray-400 uppercase tracking-widest">
                        {modalType} Name
                      </label>
                      <input
                        autoFocus
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-2xl transition-all"
                        placeholder={`Enter ${modalType} name`}
                        value={quickAddValue}
                        onChange={(e) => setQuickAddValue(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleQuickSave(setFieldValue)
                        }
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalType(null);
                          setQuickAddValue("");
                        }}
                        className="flex-1 py-3 text-2xl font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSave(setFieldValue)}
                        disabled={loading || !quickAddValue.trim()}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-2xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all"
                      >
                        {loading ? "Saving..." : `Create ${modalType}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default ProductForm;
