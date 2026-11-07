import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import FormikDatePicker from "./FormikDatePicker";
import { useAppData } from "../context/AppDataContext";
import { hasFeature } from "../utils/hasFeature";

const CreatePurchaseReplace = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const navigate = useNavigate();
  const appData = useAppData();
  const branches = appData?.managerBranches || [];
  const suppliers = appData?.suppliers || [];
  const purchaseBills = appData?.purchaseBills || [];
  const purchaseLines = appData?.purchaseLines || [];
  const [supplierId, setSupplierId] = useState("");
  const [purchaseBillId, setPurchaseBillId] = useState("");
  const [newPurchaseBill, setNewPurchaseBill] = useState("");
  const [error, setError] = useState("");
  const [fieldValue, setFieldValue] = useState(() => () => {});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [billLines, setBillLines] = useState([]);
  const lineOf = (lineId) =>
    billLines.find((b) => String(b.id) === String(lineId));
  const isPharmacy = hasFeature("pharmacy");
  const products = appData?.saleProducts || [];

  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const [initialValues] = useState({
    purchase_bill_id: "",
    supplier_id: "",
    branch_id: "",
    return_date: "",
    reason: "",
    notes: "",
    return_line_id: "",
    return_qty: "",
    new_qty: "",
    purchase_rate: "",
    mrp: "",
    selling_price: "",
    batch_no: "",
    expiry_date: "",
  });

  useEffect(() => {
    appData?.loadManagerBranches();
    appData?.loadSuppliers();
    appData?.loadPurchaseBills();
    appData?.loadPurchaseLines();
    appData?.loadSaleProducts();
  }, []);

  const handlePurchaseBillSelection = async (selectedBillId, setFieldValue) => {
    try {
      const billDetails = purchaseBills.find(
        (b) => b.id === parseInt(selectedBillId),
      );

      if (billDetails) {
        setFieldValue("branch_id", billDetails.branch_id?.toString() || "");
        setFieldValue("supplier_id", billDetails.supplier_id?.toString() || "");
      }

      // Start clean whenever the bill changes
      [
        "return_line_id",
        "return_qty",
        "new_qty",
        "purchase_rate",
        "mrp",
        "selling_price",
        "batch_no",
        "expiry_date",
      ].forEach((f) => setFieldValue(f, ""));

      const res = await axios.get(
        `${BASE_URL}/api/purchase-return/bill/${selectedBillId}/lines`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      const lines = res.data?.data || [];
      setBillLines(lines);

      if (!lines.some((l) => l.max_packs > 0)) {
        toast.info(
          "Nothing can be replaced from this bill (no stock left, or already returned).",
        );
      }
    } catch (error) {
      console.error("Error fetching bill lines:", error);
      toast.error("Failed to load bill items");
    }
  };

  const wholeNumber = (label) =>
    Yup.number()
      .typeError(`${label} is required`)
      .required(`${label} is required`)
      .integer("Must be a whole number")
      .min(1, "Must be at least 1");

  const validationSchema = Yup.object().shape({
    purchase_bill_id: Yup.string().required("Purchase Bill is required"),
    return_date: Yup.string().required("Replace Date is required"),
    return_line_id: Yup.string().required("Select the batch to replace"),
    return_qty: Yup.number()
      .typeError("Enter a valid quantity")
      .integer("Must be a whole number")
      .min(1, "Minimum 1")
      .test(
        "max-returnable",
        "More than the returnable quantity",
        function (value) {
          const line = billLines.find(
            (l) => String(l.id) === String(this.parent.return_line_id),
          );
          return !line || value <= line.max_packs;
        },
      )
      .required("Required"),
    new_qty: Yup.number()
      .typeError("Enter a valid quantity")
      .integer("Must be a whole number")
      .min(1, "Minimum 1")
      .max(Yup.ref("return_qty"), "Cannot be more than the return quantity")
      .required("Required"),
    purchase_rate: Yup.number()
      .typeError("Rate is required")
      .required("Rate is required")
      .min(0, "Cannot be negative"),
    mrp: Yup.number()
      .typeError("MRP is required")
      .required("MRP is required")
      .min(0, "Cannot be negative"),
    selling_price: Yup.number()
      .typeError("Selling price is required")
      .required("Selling price is required")
      .min(0, "Cannot be negative")
      .max(Yup.ref("mrp"), "Selling price cannot be more than MRP"),
    batch_no: isPharmacy
      ? Yup.string().trim().required("Batch number is required")
      : Yup.string(),
    expiry_date: isPharmacy
      ? Yup.string().required("Expiry date is required")
      : Yup.string(),
  });

  const handleSubmit = async (values, actions) => {
    try {
      const payload = {
        purchase_bill_id: values.purchase_bill_id,
        return_date: values.return_date,
        reason: values.reason || null,
        notes: values.notes || null,
        return_line: {
          purchase_bill_line_id: values.return_line_id,
          qty: values.return_qty,
        },
        new_item: {
          qty: values.new_qty,
          purchase_rate: values.purchase_rate,
          mrp: values.mrp,
          selling_price: values.selling_price,
          batch_no: values.batch_no || null,
          expiry_date: values.expiry_date || null,
        },
      };

      await axios.post(`${BASE_URL}/api/purchase-replacement`, payload, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      toast.success("Purchase Replacement Saved Successfully!");

      appData?.invalidate("purchaseReturns");
      await appData?.loadPurchaseReturns();

      actions.resetForm();
      navigate("/purchase-return-bill");
    } catch (error) {
      const errors = error.response?.data?.errors;
      const firstValidation = errors ? Object.values(errors)[0]?.[0] : null;

      toast.error(
        firstValidation ||
          error.response?.data?.message ||
          "Something went wrong",
      );
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">Create Purchase Replace</h3>

          <div className="wg-box" style={{ width: "100%" }}>
            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => handleSubmit(values, actions)}
            >
              {({ values, setFieldValue, isSubmitting }) => (
                <Form>
                  <div className="container">
                    <div className="row mb-20">
                      <div className="mb-20 col-md-2">
                        <label className="mb-8 purchase-label">
                          Purchase Bill No
                        </label>
                        <Field
                          as="select"
                          name="purchase_bill_id"
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldValue("purchase_bill_id", val);
                            if (val) {
                              handlePurchaseBillSelection(val, setFieldValue);
                            } else {
                              setFieldValue("lines", []);
                            }
                          }}
                        >
                          <option value="">Select Purchase Bill</option>
                          {purchaseBills?.map((b) => (
                            <option value={b.id} key={b.id}>
                              {b.bill_no}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="purchase_bill_id"
                          className="error-text"
                          component="div"
                        />
                      </div>
                      <div className="mb-20 col-md-2">
                        <label className="mb-8 purchase-label">Branch</label>
                        <Field
                          as="select"
                          name="branch_id"
                          className="mb-6"
                          disabled
                        >
                          <option value="">Select Branch</option>
                          {branches?.map((b) => (
                            <option value={b.id} key={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="branch_id"
                          className="error-text"
                          component="div"
                        />
                      </div>
                      <div className="mb-20 col-md-2">
                        <label className="mb-8 purchase-label">Supplier</label>
                        <Field
                          as="select"
                          name="supplier_id"
                          className="mb-6"
                          disabled
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="supplier_id"
                          className="error-text"
                          component="div"
                        />
                      </div>

                      <div className="mb-20 col-md-2">
                        <label
                          className="mb-8 purchase-label"
                          style={{ fontSize: "15px", display: "block" }}
                        >
                          Replace Date
                        </label>
                        <Field
                          type="date"
                          name="return_date"
                          className="form-control"
                        />
                        <ErrorMessage
                          name="return_date"
                          className="error-text"
                          component="div"
                        />
                      </div>

                      <div className="mb-20 col-md-2">
                        <label className="mb-8 purchase-label">Reason</label>
                        <Field as="select" name="reason">
                          <option value="">Select reason</option>
                          <option value="near_expiry">Near expiry</option>
                          <option value="expired">Expired</option>
                          <option value="damaged">Damaged</option>
                          <option value="wrong_item">Wrong item</option>
                          <option value="other">Other</option>
                        </Field>
                      </div>
                      <div className="mb-20 col-md-4">
                        <label className="mb-8 purchase-label">Notes</label>
                        <Field
                          type="text"
                          name="notes"
                          maxLength={500}
                          placeholder="Optional note for this replacement"
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "20px",
                      marginBottom: "16px",
                      backgroundColor: "#ffffff",
                      borderLeft: "4px solid #3b82f6",
                    }}
                  >
                    <div className="grid grid-cols-12 gap-6">
                      <div
                        className="col-span-12 lg:col-span-4"
                        style={{
                          borderRight: "1px dashed #e2e8f0",
                          paddingRight: "20px",
                        }}
                      >
                        <label className="block text-2xl font-medium text-gray-700 mb-2">
                          Source Batch (Return)
                        </label>

                        <Field name="return_line_id">
                          {({ field, form }) => (
                            <select
                              {...field}
                              className="form-select w-full text-2xl py-2 px-3 border rounded-lg"
                              onChange={(e) => {
                                const lineId = e.target.value;
                                form.setFieldValue("return_line_id", lineId);

                                const l = lineOf(lineId);
                                if (l) {
                                  form.setFieldValue(
                                    "return_qty",
                                    l.max_packs || "",
                                  );
                                  form.setFieldValue(
                                    "purchase_rate",
                                    l.purchase_rate ?? "",
                                  );
                                  form.setFieldValue("mrp", l.mrp ?? "");
                                  form.setFieldValue(
                                    "selling_price",
                                    l.selling_price ?? "",
                                  );
                                }
                              }}
                            >
                              <option value="">Select Batch/Product</option>
                              {billLines.map((p) => (
                                <option
                                  value={p.id}
                                  key={p.id}
                                  disabled={p.max_packs <= 0}
                                >
                                  {p.product_name} · {p.batch_no || "No batch"}
                                  {p.expiry_date
                                    ? ` · Exp ${p.expiry_date.slice(5, 7)}/${p.expiry_date.slice(2, 4)}`
                                    : ""}
                                  {` · Max ${p.max_packs} ${p.pack_unit}`}
                                </option>
                              ))}
                            </select>
                          )}
                        </Field>
                        <ErrorMessage
                          name="return_line_id"
                          className="error-text"
                          component="div"
                        />

                        <div className="mt-4">
                          <label className="block text-2xl font-medium text-gray-700 mb-2">
                            Return Qty (packs)
                          </label>
                          <Field
                            type="number"
                            min="1"
                            max={lineOf(values.return_line_id)?.max_packs}
                            name="return_qty"
                            className="form-control w-full"
                            placeholder="Packs to send back"
                          />
                          <ErrorMessage
                            name="return_qty"
                            className="error-text"
                            component="div"
                          />
                          {lineOf(values.return_line_id) && (
                            <div
                              style={{ color: "#64748b" }}
                              className="text-2xl"
                            >
                              Max {lineOf(values.return_line_id).max_packs}{" "}
                              {lineOf(values.return_line_id).pack_unit} · In
                              stock: {lineOf(values.return_line_id).stock_label}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-12 lg:col-span-8">
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 lg:col-span-6">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              Replacement Product
                            </label>
                            <div
                              className="form-control w-full text-2xl"
                              style={{
                                background: "#f8fafc",
                                minHeight: "44px",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {lineOf(values.return_line_id)?.product_name ||
                                "Same product as the returned batch"}
                            </div>
                          </div>

                          <div className="col-span-6 lg:col-span-3">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              New Qty (packs)
                            </label>
                            <Field
                              type="number"
                              min="1"
                              max={values.return_qty || undefined}
                              name="new_qty"
                              className="form-control w-full"
                              placeholder="0"
                            />
                            <ErrorMessage
                              name="new_qty"
                              className="error-text"
                              component="div"
                            />
                            {lineOf(values.return_line_id)?.is_loose && (
                              <div
                                style={{ color: "#64748b" }}
                                className="text-2xl"
                              >
                                1 {lineOf(values.return_line_id).pack_unit} ={" "}
                                {lineOf(values.return_line_id).units_per_pack}{" "}
                                {lineOf(values.return_line_id).loose_unit}s
                              </div>
                            )}
                          </div>

                          <div className="col-span-6 lg:col-span-3">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              Rate (per pack)
                            </label>
                            <Field
                              type="number"
                              step="any"
                              name="purchase_rate"
                              className="form-control w-full"
                              placeholder="0.00"
                            />
                            <ErrorMessage
                              name="purchase_rate"
                              className="error-text"
                              component="div"
                            />
                          </div>

                          <div className="col-span-6 lg:col-span-3">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              MRP (per pack)
                            </label>
                            <Field
                              type="number"
                              step="any"
                              name="mrp"
                              className="form-control w-full"
                              placeholder="0.00"
                            />
                            <ErrorMessage
                              name="mrp"
                              className="error-text"
                              component="div"
                            />
                          </div>

                          <div className="col-span-6 lg:col-span-3">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              New SP (per pack)
                            </label>
                            <Field
                              type="number"
                              step="any"
                              name="selling_price"
                              className="form-control w-full"
                              placeholder="0.00"
                            />
                            <ErrorMessage
                              name="selling_price"
                              className="error-text"
                              component="div"
                            />
                          </div>

                          <div className="col-span-6 lg:col-span-3">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              New Batch No{isPharmacy ? "" : " (optional)"}
                            </label>
                            <Field
                              type="text"
                              name="batch_no"
                              maxLength={50}
                              className="form-control w-full"
                              placeholder="Batch number"
                            />
                            <ErrorMessage
                              name="batch_no"
                              className="error-text"
                              component="div"
                            />
                          </div>

                          <div className="col-span-6 lg:col-span-3">
                            <label className="block text-2xl font-medium text-gray-700 mb-2">
                              New Expiry{isPharmacy ? "" : " (optional)"}
                            </label>
                            <Field
                              type="date"
                              name="expiry_date"
                              className="form-control w-full"
                            />
                            <ErrorMessage
                              name="expiry_date"
                              className="error-text"
                              component="div"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex col">
                    <button
                      type="submit"
                      className="ml-5 tf-button style-1"
                      disabled={isSubmitting}
                    >
                      Save Replace Bill
                    </button>

                    <button type="button" className="ml-5 tf-button style-1">
                      <a
                        href="/purchase-return-bill"
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

export default CreatePurchaseReplace;
