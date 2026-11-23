import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Formik,
  Form,
  Field,
  ErrorMessage,
  FieldArray,
  useFormikContext,
} from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MIN_DATE = "2000-01-01";
const MAX_LINES = 200;
const MAX_QTY = 999999;
const NOTES_MAX = 500;

const REASONS = [
  { value: "near_expiry", label: "Near expiry" },
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Damaged" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "other", label: "Other" },
];

const pad = (n) => String(n).padStart(2, "0");

// Local date (toISOString nahi, warna IST me subah date ek din peeche aati hai)
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// yyyy-mm-dd / dd-mm-yyyy / ISO datetime -> "yyyy-mm-dd" (real calendar date ho tabhi), warna ""
const toISODate = (value) => {
  if (!value) return "";
  const s = String(value).trim().split("T")[0].replace(/\//g, "-");
  let y;
  let mo;
  let d;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    d = Number(iso[3]);
  } else if (dmy) {
    d = Number(dmy[1]);
    mo = Number(dmy[2]);
    y = Number(dmy[3]);
  } else {
    return "";
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return "";
  }
  return `${y}-${pad(mo)}-${pad(d)}`;
};

const prettyDate = (iso) => {
  const v = toISODate(iso);
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
};

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user_detail")) || {};
  } catch {
    return {};
  }
};

const readIncoming = () => {
  try {
    return JSON.parse(localStorage.getItem("purchase_return_bills_create"));
  } catch {
    return null;
  }
};

const blockNonDigitKeys = (e) => {
  if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
};

// Submit galat ho to pehle error tak scroll + toast
function ScrollToFirstError() {
  const { submitCount, isValid, isSubmitting } = useFormikContext();

  useEffect(() => {
    if (submitCount > 0 && !isValid && !isSubmitting) {
      toast.error("Please fix the highlighted errors before saving.", {
        toastId: "pr-invalid-form",
      });
      setTimeout(() => {
        document
          .querySelector(".pr-page .error-text")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount, isSubmitting]);

  return null;
}

const emptyLine = () => ({ purchase_bill_line_id: "", qty: "" });

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const CreateEditPurchaseReturn = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const appData = useAppData();
  const branches = appData?.branches || [];
  const suppliers = appData?.suppliers || [];
  const purchaseBills = appData?.purchaseBills || [];

  const [billLines, setBillLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const linesRequest = useRef(0);

  const user_data = readUser();
  const incomingReturnBill = readIncoming();

  const lineOf = (lineId) =>
    billLines.find((b) => String(b.id) === String(lineId));

  const billOf = (billId) =>
    purchaseBills.find((b) => String(b.id) === String(billId));

  const [initialValues, setInitialValues] = useState({
    purchase_bill_id: "",
    supplier_id: "",
    branch_id: "",
    return_date: todayISO(),
    reason: "",
    notes: "",
    lines: [emptyLine()],
  });

  // Bill ke returnable lines laata hai (purani request ka response ignore hota hai)
  const fetchBillLines = async (billId) => {
    const reqId = ++linesRequest.current;
    setLoadingLines(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/api/purchase-return/bill/${billId}/lines`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );
      if (reqId !== linesRequest.current) return null;
      const lines = Array.isArray(res.data?.data) ? res.data.data : [];
      setBillLines(lines);
      return lines;
    } catch (error) {
      if (reqId !== linesRequest.current) return null;
      console.error("Error loading bill lines:", error);
      setBillLines([]);
      toast.error(
        error.response?.data?.message || "Failed to load bill items",
      );
      return null;
    } finally {
      if (reqId === linesRequest.current) setLoadingLines(false);
    }
  };

  useEffect(() => {
    if (incomingReturnBill) {
      setInitialValues({
        purchase_bill_id: incomingReturnBill.purchase_bill_id?.toString() || "",
        supplier_id: incomingReturnBill.supplier_id?.toString() || "",
        branch_id: incomingReturnBill.branch_id?.toString() || "",
        return_date: toISODate(incomingReturnBill.return_date) || todayISO(),
        reason: incomingReturnBill.reason || "",
        notes: incomingReturnBill.notes || "",
        lines: incomingReturnBill.lines?.length
          ? incomingReturnBill.lines.map((line) => ({
              purchase_bill_line_id: String(
                line.purchase_bill_line_id ?? line.purchase_line_id ?? "",
              ),
              qty: line.qty || "",
            }))
          : [emptyLine()],
      });
      if (incomingReturnBill.purchase_bill_id) {
        fetchBillLines(incomingReturnBill.purchase_bill_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    appData?.loadBranches();
    appData?.loadSuppliers();
    appData?.loadPurchaseBills();
    appData?.loadPurchaseLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchaseBillSelection = async (selectedBillId, setFieldValue) => {
    // Pehle purane lines hata do, taaki galat bill ke lines na dikhein
    setBillLines([]);

    if (!selectedBillId) {
      linesRequest.current += 1;
      setLoadingLines(false);
      setFieldValue("branch_id", "");
      setFieldValue("supplier_id", "");
      setFieldValue("lines", [emptyLine()]);
      return;
    }

    const bill = billOf(selectedBillId);
    if (bill) {
      setFieldValue("branch_id", bill.branch_id?.toString() || "");
      setFieldValue("supplier_id", bill.supplier_id?.toString() || "");
    }
    setFieldValue("lines", [emptyLine()]);

    const lines = await fetchBillLines(selectedBillId);
    if (!lines) return;

    const returnable = lines.filter((l) => Number(l.max_packs) > 0);

    if (returnable.length === 0) {
      toast.info(
        "Nothing can be returned from this bill (no stock left, or already returned).",
      );
      setFieldValue("lines", []);
      return;
    }

    setFieldValue(
      "lines",
      returnable.map((l) => ({
        purchase_bill_line_id: String(l.id),
        product_id: l.product_id,
        qty: l.max_packs,
      })),
    );
  };

  /* ---------- validation ---------- */
  const validationSchema = Yup.object()
    .shape({
      purchase_bill_id: Yup.string().required("Select the purchase bill"),

      branch_id: Yup.string().required("Branch is required"),

      supplier_id: Yup.string().required("Supplier is required"),

      return_date: Yup.string()
        .required("Return date is required")
        .test("valid-return-date", function (value) {
          const iso = toISODate(value);
          if (!iso) {
            return this.createError({ message: "Enter a valid return date" });
          }
          if (iso > todayISO()) {
            return this.createError({
              message: "Return date cannot be in the future",
            });
          }
          if (iso < MIN_DATE) {
            return this.createError({
              message: "Return date is too old. Check the year",
            });
          }
          return true;
        }),

      reason: Yup.string()
        .required("Select a return reason")
        .oneOf(
          REASONS.map((r) => r.value),
          "Select a valid return reason",
        ),

      notes: Yup.string()
        .nullable()
        .max(NOTES_MAX, `Notes can be at most ${NOTES_MAX} characters`),

      lines: Yup.array()
        .min(1, "Add at least one product to return")
        .max(MAX_LINES, `A return can have at most ${MAX_LINES} lines`)
        .of(
          Yup.object().shape({
            purchase_bill_line_id: Yup.string()
              .required("Select the product / batch to return")
              .test(
                "line-returnable",
                "Nothing is left to return for this item",
                (value) => {
                  if (!value) return true;
                  const line = lineOf(value);
                  return !line || Number(line.max_packs) > 0;
                },
              ),

            qty: Yup.number()
              .transform((value, original) =>
                original === "" || original == null ? undefined : value,
              )
              .typeError("Quantity must be a number")
              .required("Quantity is required")
              .moreThan(0, "Quantity must be at least 1")
              .integer("Quantity must be a whole number")
              .max(MAX_QTY, `Quantity cannot exceed ${MAX_QTY}`)
              .test("max-packs", function (value) {
                if (value == null) return true;
                const line = lineOf(this.parent.purchase_bill_line_id);
                if (!line) return true;
                const max = Number(line.max_packs) || 0;
                if (value > max) {
                  return this.createError({
                    message: `Only ${max} ${line.pack_unit || "pack(s)"} can be returned for this item`,
                  });
                }
                return true;
              }),
          }),
        ),
    })
    // Cross-field rules
    .test("cross-field-rules", "Invalid return", function (raw) {
      const v = this.originalValue || raw || {};
      const errs = [];
      const fail = (path, message) =>
        errs.push(this.createError({ path, message }));

      const bill = billOf(v.purchase_bill_id);

      if (bill) {
        if (
          v.supplier_id &&
          bill.supplier_id != null &&
          String(bill.supplier_id) !== String(v.supplier_id)
        ) {
          fail("supplier_id", "Supplier does not match the selected purchase bill");
        }
        if (
          v.branch_id &&
          bill.branch_id != null &&
          String(bill.branch_id) !== String(v.branch_id)
        ) {
          fail("branch_id", "Branch does not match the selected purchase bill");
        }

        const billDate = toISODate(bill.bill_date);
        const retDate = toISODate(v.return_date);
        if (billDate && retDate && retDate < billDate) {
          fail(
            "return_date",
            `Return date cannot be before the bill date (${prettyDate(billDate)})`,
          );
        }
      }

      if (v.reason === "other" && String(v.notes || "").trim().length < 3) {
        fail("notes", 'Please add a short note when the reason is "Other"');
      }

      const seen = new Map();
      (v.lines || []).forEach((line, i) => {
        const key = String(line.purchase_bill_line_id || "");
        if (!key) return;
        if (seen.has(key)) {
          fail(
            `lines[${i}].purchase_bill_line_id`,
            `Already added in line ${seen.get(key) + 1}. Change its quantity instead.`,
          );
        } else {
          seen.set(key, i);
        }
      });

      return errs.length ? new Yup.ValidationError(errs) : true;
    });

  /* ---------- submit ---------- */
  const handleSubmit = async (values, actions) => {
    try {
      const payload = {
        purchase_bill_id: Number(values.purchase_bill_id),
        supplier_id: Number(values.supplier_id),
        branch_id: Number(values.branch_id),
        return_date: toISODate(values.return_date),
        reason: values.reason,
        notes: String(values.notes || "").trim() || null,
        lines: values.lines.map((line) => ({
          purchase_bill_line_id: Number(line.purchase_bill_line_id),
          ...(line.product_id ? { product_id: line.product_id } : {}),
          qty: Number(line.qty),
        })),
      };

      await axios.post(`${BASE_URL}/api/purchase-return`, payload, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      toast.success("Purchase Return Saved Successfully!");

      localStorage.setItem("purchase_return_bills_create", null);
      appData?.invalidate("purchaseReturns");
      await appData?.loadPurchaseReturns();

      actions.resetForm();
      navigate("/purchase-return-bill");
    } catch (error) {
      console.error("API Error:", error.response?.data);
      const apiErrors = error.response?.data?.errors;
      const firstError = apiErrors ? Object.values(apiErrors).flat()[0] : null;
      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Something went wrong while saving",
      );
    } finally {
      actions.setSubmitting(false);
    }
  };

  const returnableCount = billLines.filter(
    (l) => Number(l.max_packs) > 0,
  ).length;

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap pr-page">
          <h3 className="mb-20">Create Purchase Return Bill</h3>

          <div className="wg-box" style={{ width: "100%" }}>
            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => handleSubmit(values, actions)}
            >
              {({ values, setFieldValue, isSubmitting, errors }) => {
                const billSelected = Boolean(values.purchase_bill_id);
                const selectedBill = billOf(values.purchase_bill_id);

                return (
                  <Form noValidate>
                    <ScrollToFirstError />

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
                              handlePurchaseBillSelection(val, setFieldValue);
                            }}
                          >
                            <option value="">Select Purchase Bill</option>
                            {purchaseBills?.map((b) => (
                              <option value={b.id} key={b.id}>
                                {b.bill_no}
                                {b.supplier?.name ? ` · ${b.supplier.name}` : ""}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="purchase_bill_id"
                            className="error-text"
                            component="div"
                          />
                          {selectedBill?.bill_date && (
                            <div className="exp-sub" style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                              Bill date: {prettyDate(selectedBill.bill_date)}
                            </div>
                          )}
                        </div>
                        <div className="mb-20 col-md-2">
                          <label className="mb-8 purchase-label">Branch</label>
                          <Field
                            as="select"
                            name="branch_id"
                            className="mb-6"
                            disabled={billSelected}
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
                            disabled={billSelected}
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
                            Return Date
                          </label>
                          <Field
                            type="date"
                            name="return_date"
                            className="form-control"
                            min={toISODate(selectedBill?.bill_date) || MIN_DATE}
                            max={todayISO()}
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
                            {REASONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="reason"
                            className="error-text"
                            component="div"
                          />
                        </div>
                        <div className="mb-20 col-md-4">
                          <label className="mb-8 purchase-label">
                            Notes{values.reason === "other" ? " *" : ""}
                          </label>
                          <Field
                            type="text"
                            name="notes"
                            maxLength={NOTES_MAX}
                            autoComplete="off"
                            placeholder={
                              values.reason === "other"
                                ? "Required: tell why you are returning"
                                : "Optional note for this return"
                            }
                          />
                          <ErrorMessage
                            name="notes"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </div>
                    </div>

                    {loadingLines && (
                      <div className="mb-15" style={{ color: "#64748b" }}>
                        Loading bill items...
                      </div>
                    )}

                    {!billSelected && (
                      <div className="mb-15" style={{ color: "#64748b" }}>
                        Select a purchase bill to see the items you can return.
                      </div>
                    )}

                    <FieldArray name="lines">
                      {({ push, remove }) => (
                        <>
                          {values?.lines?.map((line, index) => {
                            const current = lineOf(line.purchase_bill_line_id);
                            return (
                              <div
                                key={index}
                                style={{
                                  border: "1px solid #ccc",
                                  padding: 10,
                                  marginBottom: 12,
                                }}
                              >
                                <div className="line-row">
                                  <div className="line-col">
                                    <label
                                      className="mb-8 mt-12"
                                      style={{
                                        fontSize: "15px",
                                        marginTop: "12px",
                                      }}
                                    >
                                      Batch no
                                    </label>
                                    <Field
                                      as="select"
                                      name={`lines.${index}.purchase_bill_line_id`}
                                      disabled={!billSelected}
                                    >
                                      <option value="">
                                        Select Purchase Line
                                      </option>
                                      {billLines.map((p) => {
                                        const usedElsewhere = values.lines.some(
                                          (l, i) =>
                                            i !== index &&
                                            String(l.purchase_bill_line_id) ===
                                              String(p.id),
                                        );
                                        const exp = String(p.expiry_date || "");
                                        return (
                                          <option
                                            value={p.id}
                                            key={p.id}
                                            disabled={
                                              Number(p.max_packs) <= 0 ||
                                              usedElsewhere
                                            }
                                          >
                                            {p.product_name} ·{" "}
                                            {p.batch_no || "No batch"}
                                            {exp.length >= 7
                                              ? ` · Exp ${exp.slice(5, 7)}/${exp.slice(2, 4)}`
                                              : ""}
                                            {` · Max ${p.max_packs} ${p.pack_unit}`}
                                          </option>
                                        );
                                      })}
                                    </Field>
                                    <ErrorMessage
                                      name={`lines.${index}.purchase_bill_line_id`}
                                      className="error-text"
                                      component="div"
                                    />
                                  </div>

                                  <div className="line-col">
                                    <label style={{ fontSize: "15px" }}>
                                      Qty
                                    </label>
                                    <Field
                                      type="number"
                                      min="1"
                                      step="1"
                                      inputMode="numeric"
                                      max={current?.max_packs}
                                      name={`lines.${index}.qty`}
                                      placeholder="Packs to return"
                                      onKeyDown={blockNonDigitKeys}
                                      onWheel={(e) => e.target.blur()}
                                    />
                                    {current && (
                                      <div
                                        className="text-2xl"
                                        style={{ color: "#64748b" }}
                                      >
                                        Max {current.max_packs}{" "}
                                        {current.pack_unit} · In stock:{" "}
                                        {current.stock_label}
                                        {current.is_loose &&
                                          ` · 1 ${current.pack_unit} = ${current.units_per_pack} ${current.loose_unit}s`}
                                      </div>
                                    )}
                                    <ErrorMessage
                                      name={`lines.${index}.qty`}
                                      className="error-text"
                                      component="div"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    disabled={values.lines.length <= 1}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {typeof errors.lines === "string" && (
                            <div className="error-text mb-15">
                              {errors.lines}
                            </div>
                          )}

                          <button
                            type="button"
                            className="tf-button style-1 mb-20"
                            disabled={
                              !billSelected ||
                              values.lines.length >= returnableCount ||
                              values.lines.length >= MAX_LINES
                            }
                            onClick={() => push(emptyLine())}
                          >
                            + Add Product
                          </button>
                        </>
                      )}
                    </FieldArray>

                    <div className="flex">
                      <button
                        type="submit"
                        disabled={isSubmitting || loadingLines}
                        className="ml-5 tf-button style-1"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {isSubmitting ? "Saving..." : "Save Return Bill"}
                      </button>
                      <Link
                        to="/purchase-return-bill"
                        className="ml-5 tf-button style-1"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        Cancel
                      </Link>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditPurchaseReturn;