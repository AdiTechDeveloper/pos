import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray, useField, useFormikContext } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import ProductForm from "./ProductForm";
import ProductSearchSelect from "./ProductSearchSelect";
import { useAppData } from "../context/AppDataContext";
import FormikDatePicker from "./FormikDatePicker";
import { hasFeature } from "../utils/hasFeature";

const ledgerStyles = `
  :root {
    --pb-navy: #3563c7;
    --pb-navy-soft: #2f4ca2;
    --pb-ivory: #f5f8fb;
    --pb-paper: #FFFFFF;
    --pb-gold: #3894da;
    --pb-gold-soft: #F3E6C8;
    --pb-text: #3D3527;
    --pb-muted: #8A8170;
    --pb-border: #b7c5d2;
    --pb-border-strong: #b7c5d2;
    --pb-green: #3E9C76;
    --pb-green-bg: #EEFAF3;
    --pb-red: #D1655A;
    --pb-red-bg: #FDEEEC;
  }

  .pb-page {
    // background: var(--pb-ivory);
    padding: 28px 28px 80px;
    border-radius: 16px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--pb-text);
  }

  .pb-header-strip {
    border: 1px solid var(--pb-border-strong);
    border-radius: 14px;
    padding: 22px 28px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 14px rgba(200, 155, 74, 0.08);
  }
  .pb-header-strip h3 {
    color: var(--pb-text);
    margin: 0;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  .pb-header-eyebrow {
    color: var(--pb-gold);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin: 0 0 4px;
  }

  .pb-card {
    background: var(--pb-paper);
    border: 1px solid var(--pb-border);
    border-radius: 14px;
    padding: 9px 24px;
    margin-bottom: 20px;
    box-shadow: 0 1px 2px rgba(15, 27, 46, 0.04);
  }

  .pb-section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    // color: var(--pb-gold);
    margin: 0 0 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pb-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--pb-border-strong);
  }

  .pb-field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--pb-muted);
    margin-bottom: 6px;
    letter-spacing: 0.2px;
  }

  .pb-page input[type="text"],
  .pb-page input[type="number"],
  .pb-page input[type="date"],
  .pb-page select,
  .pb-page textarea {
    width: 100%;
    height: 42px;
    border: 1.5px solid var(--pb-border-strong);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--pb-text);
    background: var(--pb-paper);
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }
  .pb-page textarea { height: auto; padding: 10px 12px; }
  .pb-page input:focus,
  .pb-page select:focus,
  .pb-page textarea:focus {
    outline: none;
    border-color: var(--pb-gold);
    box-shadow: 0 0 0 3px rgba(184, 137, 63, 0.15);
  }
  .pb-page input::placeholder { color: #A8A29B; }
  .pb-page input:disabled { color: var(--pb-muted); }

  .error-text {
    color: var(--pb-red);
    font-size: 12px;
    font-weight: 500;
    margin-top: 5px;
  }

  .lost-bill-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    border: 1.5px solid var(--pb-border-strong);
    border-radius: 9px;
    width: fit-content;
    background: var(--pb-ivory);
    flex-shrink: 0;
  }
  .lost-bill-wrapper .toggle-label-text {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--pb-muted);
    cursor: pointer;
    user-select: none;
    transition: color 0.2s;
    white-space: nowrap;
  }
  .lost-bill-wrapper.active {
    background: var(--pb-red-bg);
    border-color: #E8B6B1;
  }
  .lost-bill-wrapper.active .toggle-label-text {
    color: var(--pb-red);
  }

  .toggle-switch { position: relative; width: 38px; height: 21px; flex-shrink: 0; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-track {
    position: absolute; inset: 0;
    background: green;
    border-radius: 11px;
    cursor: pointer;
    transition: background 0.25s;
  }
  .toggle-track::before {
    content: '';
    position: absolute;
    width: 15px; height: 15px;
    left: 3px; top: 3px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.25s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  }
  .toggle-switch input:checked + .toggle-track { background: var(--pb-red); }
  .toggle-switch input:checked + .toggle-track::before { transform: translateX(17px); }

  .lost-bill-input { color: var(--pb-red) !important; font-weight: 600 !important; }
  .lost-bill-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--pb-red);
    margin-top: 8px;
    padding: 7px 12px;
    background: var(--pb-red-bg);
    border-radius: 7px;
    border-left: 3px solid var(--pb-red);
  }

  .pb-barcode-input {
    border: 1.5px dashed var(--pb-gold) !important;
    // background: #FFFBF2 !important;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
    margin-bottom: 16px !important;
  }

  #small-popup{
    font-size:17px !important;
    width :103% !important;
    background : #fff !important;
    padding:9px 12px !important;
    border  : 1px solid black;
  }

  .input-name{
    margin-bottom : 3px;
    font-size : 15px;
    font-weight :600;
    margin-top : 10px;
  }

  .pb-lines-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }
  .pb-line-row {
    display: grid;
    grid-template-columns: 220px 70px 70px 110px 110px 110px 90px 100px 90px 140px 160px 36px;
    gap: 10px;
    align-items: end;
    padding: 14px 16px 14px 18px;
    border: 1px solid var(--pb-border);
    border-left: 3px solid var(--pb-gold);
    border-radius: 9px;
    margin-bottom: 10px;
    background: var(--pb-paper);
    position: relative;
    transition: box-shadow 0.15s;
    min-width: 1320px;
  }
  .pb-line-row.with-batch {
    grid-template-columns: 220px 70px 70px 110px 110px 110px 90px 100px 90px 130px 140px 160px 36px;
    min-width: 1460px;
  }
  .pb-line-row:hover { box-shadow: 0 2px 8px rgba(15, 27, 46, 0.06); }
  .pb-line-row.is-opening {
    border-left-color: var(--pb-green);
    background: var(--pb-green-bg);
  }

  .field-col { display: flex; flex-direction: column; }
  .field-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--pb-muted);
    margin-bottom: 4px;
  }
  .field-error { color: var(--pb-red); font-size: 10.5px; margin-top: 2px; }

  .pb-remove-btn {
    background: none;
    border: none;
    color: var(--pb-red);
    font-size: 16px;
    cursor: pointer;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background 0.15s;
  }
  .pb-remove-btn:hover { background: var(--pb-red-bg); }

  .pb-add-product-btn {
    margin-top: 8px;
    background: var(--pb-paper);
    border: 1.5px dashed var(--pb-border-strong);
    color: var(--pb-navy);
    font-weight: 600;
    font-size: 13px;
    padding: 12px;
    border-radius: 9px;
    width: 100%;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .pb-add-product-btn:hover {
    border-color: var(--pb-gold);
    color: var(--pb-gold);
    background: #FFFBF2;
  }

  .pb-tax-toggle {
    display: flex;
    padding: 4px;
    border-radius: 9px;
    border: 1.5px solid var(--pb-border-strong);
    // background: var(--pb-ivory);
    gap: 4px;
  }
  .pb-tax-btn {
    flex: 1;
    border: none;
    border-radius: 7px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.18s ease;
    background: transparent;
    color: var(--pb-muted);
  }
  .pb-tax-btn.active-exclusive { background: var(--pb-red); color: #fff; box-shadow: 0 2px 6px rgba(206, 42, 27, 0.3); }
  .pb-tax-btn.active-inclusive { background: var(--pb-green); color: #fff; box-shadow: 0 2px 6px rgba(62,156,118,0.3); }

  .pb-total-bar {
    padding: 18px 26px;
    border-radius: 12px;
    // background: linear-gradient(135deg, #7094b8 0%, var(--pb-gold-soft) 100%);
    border: 1px solid var(--pb-border-strong);
    display: flex;
    color : white;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 14px rgba(85, 139, 215, 0.1);
  }
  .pb-total-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pb-total-icon {
    width: 34px; height: 34px;
    background: var(--pb-gold);
    color: #1D4ED8;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .pb-total-label span {
    font-weight: 700;
    color: var(--pb-navy);
    font-size: 13px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  .pb-total-amount {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
  .pb-total-amount small {
    font-size: 16px;
    font-weight: 700;
    color: var(--pb-gold);
  }
  .pb-total-amount span {
    font-size: 1.9rem;
    font-weight: 800;
    color: var(--pb-text);
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }

  .pb-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 4px;
  }
  .pb-bottom-row .pb-total-bar { flex: 1; max-width: 480px; margin-left: auto; }
  .pb-bottom-row .pb-submit-btn { margin-top: 0; width: auto; padding: 15px 32px; flex-shrink: 0; }

  .pb-submit-btn {
    background: var(--pb-gold);
    border: none;
    color: #ffffff;
    border-radius: 8px;
    padding: 15px 32px;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
    box-shadow: 0 4px 14px rgba(200, 155, 74, 0.28);
  }
  .pb-submit-btn:hover { filter: brightness(1.06); }
  .pb-submit-btn:active { transform: translateY(1px); }

  .pb-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 27, 46, 0.55);
    backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
  }
  .pb-modal-card {
    background: var(--pb-paper);
    border-radius: 14px;
    width: 420px;
    box-shadow: 0 25px 60px rgba(15,27,46,0.3);
    overflow: hidden;
  }
  .pb-modal-header {
    background: var(--pb-gold);
    padding: 16px 22px;
  }
  .pb-modal-header h5 { color: #fff; margin: 0; font-size: 16px; font-weight: 700; }
  .pb-modal-body { padding: 20px 22px; }
  .pb-modal-footer {
    padding: 14px 22px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid var(--pb-border);
  }
  .pb-btn-cancel {
    background: var(--pb-paper);
    border: 1.5px solid var(--pb-border-strong);
    color: var(--pb-text);
    border-radius: 8px;
    padding: 9px 18px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }
  .pb-btn-save {
    background: var(--pb-paper);
    border: 1.5px solid var(--pb-border-strong);
    color: var(--pb-text);
    border-radius: 8px;
    padding: 9px 18px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }
  .pb-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  .payment-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  /* ── Status & Payment Ledger Styles ── */
  .status-badge {
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .status-badge.paid { background: var(--pb-green-bg); color: var(--pb-green); border: 1px solid var(--pb-green); }
  .status-badge.due { background: var(--pb-red-bg); color: var(--pb-red); border: 1px solid var(--pb-red); }
  .status-badge.partial { background: #FFFBF2; color: var(--pb-gold); border: 1px solid var(--pb-gold); }

  .payment-summary-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-radius: 10px;
    margin-bottom: 16px;
    font-weight: 600;
  }
  .payment-summary-box.due-bg {
    background: var(--pb-red-bg);
    border: 1px dashed var(--pb-red);
    color: var(--pb-red);
  }
  .payment-summary-box.paid-bg {
    background: var(--pb-green-bg);
    border: 1px dashed var(--pb-green);
    color: var(--pb-green);
  }
`;

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

const MIN_BILL_DATE = "2000-01-01";
const MAX_LINES = 200;
const MAX_MONEY = 99999999;
const MAX_QTY = 999999;
const NEAR_EXPIRY_DAYS = 90;

const BILL_NO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\-_. ]*$/;
const BATCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\-_. ]*$/;
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\-_. #]*$/;
const SUPPLIER_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()/-]*$/u;

const pad = (n) => String(n).padStart(2, "0");

// Local date (toISOString nahi, warna IST me subah date ek din peeche aati hai)
const daysFromToday = (n = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayISO = () => daysFromToday(0);

// yyyy-mm-dd ya dd-mm-yyyy dono accept; real calendar date ho to "yyyy-mm-dd" lautata hai, warna ""
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
const normalizeExpiryDate = (value) => {
  if (!value) return "";

  const s = String(value).trim().replace(/\./g, "/");

  // Existing full date formats: YYYY-MM-DD / DD-MM-YYYY
  const fullDate = toISODate(s);
  if (fullDate) return fullDate;

  // MM/YY or MM/YYYY
  const monthYear = s.match(/^(\d{1,2})[-/](\d{2}|\d{4})$/);

  if (monthYear) {
    const month = Number(monthYear[1]);
    let year = Number(monthYear[2]);

    if (year < 100) year += 2000;

    if (month >= 1 && month <= 12) {
      return `${year}-${pad(month)}-01`;
    }
  }

  // DD-MM-YY or DD/MM/YY
  const shortDate = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);

  if (shortDate) {
    const day = Number(shortDate[1]);
    const month = Number(shortDate[2]);
    const year = 2000 + Number(shortDate[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  return "";
};
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round4 = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;

// Trailing zeros ignore (DB se "45.0000" aaye to galat error na aaye)
const decimalsOf = (v) => {
  const s = String(v ?? "");
  const i = s.indexOf(".");
  if (i === -1) return 0;
  return s.slice(i + 1).replace(/0+$/, "").length;
};

const numField = (
  label,
  { required = false, min = 0, moreThan, max, decimals = 2, emptyAs } = {},
) => {
  let s = Yup.number()
    .transform((value, original) => {
      if (original === "" || original === null || original === undefined) {
        return emptyAs !== undefined ? emptyAs : undefined;
      }
      return value;
    })
    .typeError(`${label} must be a number`);

  if (required) s = s.required(`${label} is required`);
  else s = s.nullable();

  if (moreThan !== undefined) {
    s = s.moreThan(moreThan, `${label} must be greater than ${moreThan}`);
  } else {
    s = s.min(min, `${label} cannot be negative`);
  }
  if (max !== undefined) {
    s = s.max(max, `${label} cannot exceed ${max.toLocaleString("en-IN")}`);
  }
  s = s.test(
    "max-decimals",
    `${label} can have at most ${decimals} decimal place${decimals === 1 ? "" : "s"}`,
    function () {
      return decimalsOf(this.originalValue) <= decimals;
    },
  );
  return s;
};

const sanitizers = {
  billNo: (v) =>
    String(v ?? "")
      .replace(/[^A-Za-z0-9/\-_. ]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[^A-Za-z0-9]+/, "")
      .slice(0, 20),
  hsn: (v) => String(v ?? "").replace(/\D/g, "").slice(0, 8),
  batch: (v) =>
    String(v ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9/\-_. ]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[^A-Z0-9]+/, "")
      .slice(0, 50),
  reference: (v) =>
    String(v ?? "")
      .replace(/[^A-Za-z0-9/\-_. #]/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[^A-Za-z0-9]+/, "")
      .slice(0, 50),
};

function validateSupplierForm(name, state, suppliers) {
  const errors = {};
  const value = String(name || "").replace(/\s+/g, " ").trim();
  if (!value) errors.name = "Supplier name is required.";
  else if (value.length < 3) errors.name = "Supplier name must be at least 3 characters.";
  else if (value.length > 100) errors.name = "Supplier name can be at most 100 characters.";
  else if (!SUPPLIER_PATTERN.test(value)) {
    errors.name = "Use only letters, numbers, spaces and & . , ' ( ) / - in the name.";
  } else if (
    suppliers.some(
      (s) =>
        String(s.name || "").replace(/\s+/g, " ").trim().toLowerCase() ===
        value.toLowerCase(),
    )
  ) {
    errors.name = "A supplier with this name already exists.";
  }
  if (!state) errors.state = "Select the supplier's state (needed for GST).";
  return { errors, value };
}

/* ------------------------------------------------------------------ */
/*  Small form pieces                                                  */
/* ------------------------------------------------------------------ */

// Number fields: e, +, - block; decimals limit; scroll se value na badle
function LiveFormikField({ name, decimals = 2, sanitize, ...props }) {
  const [field] = useField(name);
  const { setFieldTouched, setFieldValue } = useFormikContext();
  const isNumber = props.type === "number";

  return (
    <input
      {...field}
      {...props}
      value={field.value ?? ""}
      {...(isNumber ? { min: 0, step: "any", inputMode: "decimal" } : {})}
      onKeyDown={(e) => {
        if (isNumber && ["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
        props.onKeyDown?.(e);
      }}
      onWheel={(e) => e.target.blur()}
      onChange={(e) => {
        const v = e.target.value;

        if (sanitize) {
          setFieldTouched(name, true, false);
          setFieldValue(name, sanitize(v));
          return;
        }

        if (isNumber && v !== "") {
          if (decimals === 0 && v.includes(".")) return;
          const frac = v.split(".")[1];
          if (frac && frac.length > decimals) return;
        }

        setFieldTouched(name, true, false);
        field.onChange(e);
      }}
    />
  );
}

// Submit galat ho to pehle error tak scroll + toast
function ScrollToFirstError() {
  const { submitCount, isValid, isSubmitting } = useFormikContext();

  useEffect(() => {
    if (submitCount > 0 && !isValid && !isSubmitting) {
      toast.error("Please fix the highlighted errors before saving.", {
        toastId: "pb-invalid-form",
      });
      setTimeout(() => {
        document
          .querySelector(".pb-page .error-text, .pb-page .field-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount, isSubmitting]);

  return null;
}

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user_detail")) || {};
  } catch {
    return {};
  }
};

const emptyLine = () => ({
  product_id: "",
  qty: "",
  free_qty: "",
  purchase_rate: "",
  mrp: "",
  selling_price: "",
  discount_type: "",
  discount: "",
  hsn_code: "",
  gst_rate_id: "",
  batch_no: "",
  expiry_date: "",
  is_opening: false,
});

const CreateEditPurchaseBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const navigate = useNavigate();
  const appData = useAppData();
  const [billImage, setBillImage] = useState(null);
  const [isScanningBill, setIsScanningBill] = useState(false);
  const branches = appData?.branches || [];
  const suppliers = appData?.suppliers || [];
  const products = appData?.purchaseProducts || [];

  // Cache of products picked via search / AI scan / newly created / bill's own products.
  // appData.purchaseProducts sirf pehla page (50) hai, isliye baaki sab yahan cache hote hain.
  const [aiMatchedProducts, setAiMatchedProducts] = useState([]);

  const cacheProducts = (list) => {
    const valid = (list || []).filter((p) => p?.id != null);
    if (!valid.length) return;
    setAiMatchedProducts((previous) => {
      const byId = new Map(previous.map((p) => [String(p.id), p]));
      valid.forEach((p) => byId.set(String(p.id), p));
      return Array.from(byId.values());
    });
  };

  const availablePurchaseProducts = useMemo(() => {
    const byId = new Map();
    [...products, ...aiMatchedProducts].forEach((product) => {
      if (product?.id != null) byId.set(String(product.id), product);
    });
    return Array.from(byId.values());
  }, [products, aiMatchedProducts]);
  const gstRates = appData?.gstRates || [];
  const [supplierId, setSupplierId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isBillLost, setIsBillLost] = useState(false);

  const formikRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [newSupplier, setNewSupplier] = useState("");
  const [supplierState, setSupplierState] = useState("");
  const [error, setError] = useState("");
  const [stateError, setStateError] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const user_data = readUser();
  const store_purchase_bill = localStorage.getItem("purchase_bills_create");
  // Parse once per actual localStorage value change, not on every render.
  // This keeps incomingBill's object reference stable and prevents the edit
  // fetch effect from repeatedly firing after state updates.
  const incomingBill = useMemo(() => {
    if (!store_purchase_bill) return null;

    try {
      return JSON.parse(store_purchase_bill);
    } catch (parseError) {
      console.error("Invalid purchase bill data in localStorage:", parseError);
      return null;
    }
  }, [store_purchase_bill]);
  const isEdit = Boolean(id);
  const isPharmacy = hasFeature("pharmacy");
  const showBatch = isPharmacy || hasFeature("batch_entry");

  const [initialValues, setInitialValues] = useState({
    branch_id: "",
    supplier_id: "",
    bill_no: "",
    bill_date: "",
    tax_type: "exclusive",
    settlement_amount: "",
    notes: "",
    is_lost: 0,
    lines: [emptyLine()],
    payments: [],
  });

  const setBillInitialValues = (bill) => {
    const normalizeDate = (value) => {
      if (!value) return "";
      const datePart = String(value).split("T")[0];
      const parts = datePart.split("-");
      if (parts.length !== 3) return value;
      if (parts[0].length === 4) return datePart;
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    };

    setSupplierId(bill.supplier_id?.toString() || "");
    setIsBillLost(Number(bill.is_lost) === 1);

    // Bill ke products ko cache me daalo, taaki 50 ke bahar wale products ka
    // naam / sale_type / pack info edit mode me bhi dikhe.
    cacheProducts((bill.lines || []).map((l) => l.product));

    setInitialValues({
      branch_id: bill.branch_id?.toString() || "",
      supplier_id: bill.supplier_id?.toString() || "",
      bill_no: bill.bill_no || "",
      bill_date: normalizeDate(bill.bill_date),
      tax_type: bill.tax_type || "exclusive",
      settlement_amount:
        bill.settlement_amount != null ? bill.settlement_amount : "",
      notes: bill.notes || "",
      is_lost: bill.is_lost ?? 0,
      lines: bill.lines?.length
        ? bill.lines.map((line) => ({
          ...line,
          inventory: line.inventory,
          product_id: line.product_id?.toString() || "",
          qty: line.qty || "",
          free_qty: line.free_qty || "",
          purchase_rate:
            line.purchase_rate ??
            line.inventory?.cost_price ??
            line.inventory?.rate ??
            "",
          mrp: line.mrp ?? line.inventory?.mrp ?? "",
          selling_price:
            line.selling_price ?? line.inventory?.selling_price ?? "",
          discount_type: line.discount_type || "",
          discount: line.discount || "",
          hsn_code: line.hsn_code || "",
          gst_rate_id: line.gst_rate_id?.toString() || "",
          batch_no: line.batch_no ?? line.inventory?.batch_no ?? "",
          expiry_date: normalizeDate(
            line.expiry_date ?? line.inventory?.expiry_date,
          ),
          is_opening: line.is_opening || false,
        }))
        : initialValues.lines,
      payments: bill.payments?.length
        ? bill.payments.map((p) => ({
          amount: p.amount || "",
          method: p.method ?? p.payment_method ?? "cash",
          reference: p.reference || "",
          payment_date: normalizeDate(p.payment_date),
        }))
        : [],
    });
  };

  const fetchPurchaseBillById = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`${BASE_URL}/api/purchase-bill/${id}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      const billData =
        response.data.purchase_bill ||
        response.data.bill ||
        response.data.data ||
        response.data;
      if (billData) {
        setBillInitialValues(billData);
      }
    } catch (error) {
      console.error("Error fetching purchase bill:", error);
      toast.error(
        error.response?.data?.message || "Could not load this purchase bill.",
      );
    }
  };

  useEffect(() => {
    if (isEdit && id) {
      fetchPurchaseBillById();
    } else if (incomingBill) {
      setBillInitialValues(incomingBill);
    }
    // Edit mode: fetch when bill ID changes.
    // Create-from-scanned/imported bill: initialize when incoming bill changes.
  }, [id, isEdit, incomingBill]);

  const fetchBranch = () => {
    appData?.loadBranches();
  };

  useEffect(() => {
    appData?.loadBranches();
    appData?.loadSuppliers();
    appData?.loadPurchaseProducts();
    appData?.loadGstRates();
  }, []);

  const getGstRate = (gstRateId) => {
    const matched = gstRates.find(
      (rate) => rate.id?.toString() === gstRateId?.toString(),
    );
    return matched ? Number(matched.rate || 0) : 0;
  };

  const formatAmount = (amount) =>
    Number(amount || 0)
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const findProduct = (productId) =>
    availablePurchaseProducts.find((p) => String(p.id) === String(productId));

  /* ---------- totals (render + validation dono yahi use karte hain) ---------- */
  const calcGrandTotal = (values) =>
    (values.lines || []).reduce((sum, line) => {
      const qty = Number(line.qty) || 0;
      const purchaseRate = Number(line.purchase_rate) || 0;
      const discount = Number(line.discount || 0);
      const discountType = line.discount_type;
      const gstRate = getGstRate(line.gst_rate_id);

      if (!qty || !purchaseRate) return sum;

      const grossValue =
        values.tax_type === "inclusive"
          ? qty * (purchaseRate / (1 + gstRate / 100))
          : qty * purchaseRate;

      const discountAmount =
        discountType === "percent" ? grossValue * (discount / 100) : discount;

      const taxable = Math.max(0, grossValue - discountAmount);
      const totalTax = (taxable * gstRate) / 100;

      return sum + (taxable + totalTax);
    }, 0);

  const effectiveTotalOf = (values) => {
    if (
      values.settlement_amount !== "" &&
      values.settlement_amount != null &&
      !isNaN(Number(values.settlement_amount))
    ) {
      return Number(values.settlement_amount);
    }
    if (incomingBill?.total_amount) return Number(incomingBill.total_amount);
    return calcGrandTotal(values);
  };

  /* ---------- validation schema ---------- */
  const validationSchema = Yup.object()
    .shape({
      branch_id: Yup.string().required("Branch is required"),

      supplier_id: Yup.string()
        .required("Supplier is required")
        .test(
          "not-add-new",
          "Select a supplier or save the new one first",
          (value) => value !== "add_new",
        ),

      bill_no: Yup.string()
        .trim()
        .required("Bill No is required")
        .max(20, "Bill No can be at most 20 characters")
        .matches(
          BILL_NO_PATTERN,
          "Bill No can contain only letters, numbers and / - _ .",
        ),

      bill_date: Yup.string()
        .required("Bill date is required")
        .test("valid-bill-date", function (value) {
          const iso = toISODate(value);
          if (!iso) return this.createError({ message: "Enter a valid bill date" });
          if (iso > todayISO()) {
            return this.createError({ message: "Bill date cannot be in the future" });
          }
          if (iso < MIN_BILL_DATE) {
            return this.createError({ message: "Bill date is too old. Check the year" });
          }
          return true;
        }),

      tax_type: Yup.string()
        .oneOf(["inclusive", "exclusive"], "Select a tax billing type")
        .required("Select a tax billing type"),

      settlement_amount: numField("Settlement amount", {
        required: true,
        max: MAX_MONEY,
        decimals: 2,
      }),

      notes: Yup.string()
        .nullable()
        .max(500, "Remarks can be at most500 characters"),

      lines: Yup.array()
        .min(1, "At least one product is required")
        .max(MAX_LINES, `A bill can have at most${MAX_LINES} product lines`)
        .of(
          Yup.object().shape({
            product_id: Yup.string()
              .required("Select a product")
              .test(
                "not-add-new",
                "Select a product or save the new one first",
                (value) => value !== "add_new",
              ),

            qty: numField("Quantity", {
              required: true,
              moreThan: 0,
              max: MAX_QTY,
              decimals: 3,
            }).test(
              "whole-qty",
              "Quantity must be a whole number for this product",
              function (value) {
                if (value == null) return true;
                const p = findProduct(this.parent.product_id);
                if (p?.sale_type === "weight") return true;
                return Number.isInteger(value);
              },
            ),

            free_qty: numField("Free quantity", {
              max: MAX_QTY,
              decimals: 3,
              emptyAs: 0,
            }).test(
              "whole-free-qty",
              "Free quantity must be a whole number for this product",
              function (value) {
                if (value == null) return true;
                const p = findProduct(this.parent.product_id);
                if (p?.sale_type === "weight") return true;
                return Number.isInteger(value);
              },
            ),

            purchase_rate: numField("Purchase rate", {
              required: true,
              moreThan: 0,
              max: MAX_MONEY,
              decimals: 4,
            }).test(
              "rate-le-mrp",
              "Purchase rate cannot be greater than MRP",
              function (value) {
                const mrp = num(this.parent.mrp);
                return !mrp || value == null || value <= mrp;
              },
            ),

            mrp: numField("MRP", {
              required: true,
              min: 0,
              max: MAX_MONEY,
              decimals: 2,
            }),

            selling_price: numField("Selling price", {
              required: true,
              min: 0,
              max: MAX_MONEY,
              decimals: 2,
            }).test(
              "sp-le-mrp",
              "Selling price cannot be greater than MRP",
              function (value) {
                const mrp = num(this.parent.mrp);
                return !mrp || value == null || value <= mrp;
              },
            ),

            hsn_code: Yup.string()
              .nullable()
              .transform((value) => value?.trim() || "")
              .matches(
                /^$|^\d{4}$|^$|^\d{5}$|^$|^\d{6}$|^\d{7}$|^\d{8}$/,
                "HSN must be 4, 6 or 8 digits",
              ),

            batch_no: (isPharmacy
              ? Yup.string()
                .trim()
                .required("Batch number is required")
              : Yup.string().nullable().trim()
            )
              .max(50, "Batch number cannot exceed 50 characters")
              .test(
                "batch-chars",
                "Batch can contain only letters, numbers and / - _ .",
                (value) => !value || BATCH_PATTERN.test(value),
              ),

            discount_type: Yup.string()
              .nullable()
              .oneOf(["percent", "fixed", "", null], "Invalid discount type"),

            discount: numField("Discount", {
              max: MAX_MONEY,
              decimals: 2,
              emptyAs: 0,
            }).test("discount-rules", function (value) {
              const d = num(value);
              if (!d) return true;
              const { discount_type: type, qty, purchase_rate: rate } = this.parent;
              if (!type) {
                return this.createError({ message: "Select a discount type (% or ₹)" });
              }
              if (type === "percent" && d > 100) {
                return this.createError({ message: "Percent discount cannot exceed 100" });
              }
              if (type === "fixed") {
                const gross = num(qty) * num(rate);
                if (gross && d > gross) {
                  return this.createError({
                    message: `Discount cannot exceed the line amount (₹${formatAmount(gross)})`,
                  });
                }
              }
              return true;
            }),

            gst_rate_id: Yup.string()
              .required("GST rate required")
              .test(
                "gst-exists",
                "Select a valid GST rate",
                (value) =>
                  !gstRates.length ||
                  gstRates.some((g) => String(g.id) === String(value)),
              ),

            expiry_date: Yup.string()
              .nullable()
              .test("expiry-format", function (value) {
                const raw = String(value || "").trim();
                if (!raw) {
                  return isPharmacy
                    ? this.createError({ message: "Expiry date is required" })
                    : true;
                }
                if (!toISODate(raw)) {
                  return this.createError({ message: "Enter a valid expiry date" });
                }
                return true;
              }),
          }),
        ),

      payments: Yup.array().of(
        Yup.object().shape({
          amount: numField("Amount", {
            required: true,
            moreThan: 0,
            max: MAX_MONEY,
            decimals: 2,
          }),

          method: Yup.string()
            .required("Method is required")
            .oneOf(["cash", "online", "bank"], "Invalid payment method"),

          reference: Yup.string()
            .nullable()
            .trim()
            .max(50, "Reference can be at most 50 characters")
            .test(
              "ref-chars",
              "Reference can contain only letters, numbers and / - _ . #",
              (value) => !value || REF_PATTERN.test(value),
            )
            .test(
              "ref-required",
              "Reference / transaction ID is required for online and bank payments (min 4 characters)",
              function (value) {
                if (this.parent.method === "cash") return true;
                return String(value || "").trim().length >= 4;
              },
            ),

          payment_date: Yup.string()
            .nullable()
            .test("valid-payment-date", function (value) {
              if (!value) return true;
              const iso = toISODate(value);
              if (!iso) return this.createError({ message: "Enter a valid payment date" });
              if (iso > todayISO()) {
                return this.createError({ message: "Payment date cannot be in the future" });
              }
              return true;
            }),
        }),
      ),
    })
    // Cross-field rules (dates, duplicates, overpayment)
    .test("cross-field-rules", "Invalid bill", function (raw) {
      const v = this.originalValue || raw || {};
      const errs = [];
      const fail = (path, message) =>
        errs.push(this.createError({ path, message }));

      const billDate = toISODate(v.bill_date);
      const today = todayISO();
      const maxExpiry = daysFromToday(3650);

      const seen = new Map();
      (v.lines || []).forEach((line, i) => {
        if (line.product_id && line.product_id !== "add_new") {
          const key = [
            line.product_id,
            String(line.batch_no || "").trim().toUpperCase(),
            toISODate(line.expiry_date),
          ].join("|");
          if (seen.has(key)) {
            fail(
              `lines[${i}].product_id`,
              `Same product, batch and expiry as line ${seen.get(key) + 1}. Merge the quantities.`,
            );
          } else {
            seen.set(key, i);
          }
        }

        const exp = toISODate(line.expiry_date);
        if (exp) {
          if (billDate && exp < billDate) {
            fail(`lines[${i}].expiry_date`, "Expiry cannot be before the bill date");
          } else if (!isEdit && !line.is_opening && exp < today) {
            fail(`lines[${i}].expiry_date`, "This item is already expired");
          } else if (exp > maxExpiry) {
            fail(`lines[${i}].expiry_date`, "Expiry is too far ahead (max 10 years). Check the year");
          }
        }
      });

      const payments = v.payments || [];
      let paid = 0;
      payments.forEach((p, i) => {
        paid += num(p.amount);
        const pd = toISODate(p.payment_date);
        if (pd && billDate && pd < billDate) {
          fail(`payments[${i}].payment_date`, "Payment date cannot be before the bill date");
        }
      });

      if (payments.length) {
        const total = effectiveTotalOf(v);
        if (paid - total > 1) {
          fail(
            `payments[${payments.length - 1}].amount`,
            `Total payments (₹${formatAmount(paid)}) exceed the bill total (₹${formatAmount(total)})`,
          );
        }
      }

      return errs.length ? new Yup.ValidationError(errs) : true;
    });

  /* ---------- submit ---------- */
  const handleSubmit = async (values, actions) => {
    try {
      const settlement =
        values.settlement_amount !== "" && values.settlement_amount != null
          ? round2(Number(values.settlement_amount))
          : null;

      // Real-world sanity checks: block nahi karte, par save se pehle confirm karate hain
      const warnings = [];
      const calc = round2(calcGrandTotal(values));
      if (
        settlement != null &&
        calc > 0 &&
        Math.abs(settlement - calc) > Math.max(10, calc * 0.05)
      ) {
        warnings.push(
          `Settlement amount (₹${formatAmount(settlement)}) differs a lot from the calculated total (₹${formatAmount(calc)}).`,
        );
      }

      const belowCost = values.lines.filter(
        (l) =>
          num(l.selling_price) > 0 &&
          num(l.purchase_rate) > 0 &&
          num(l.selling_price) < num(l.purchase_rate),
      ).length;
      if (belowCost) {
        warnings.push(
          `${belowCost} line(s) have a selling price lower than the purchase rate (loss on sale).`,
        );
      }

      const today = todayISO();
      const soon = daysFromToday(NEAR_EXPIRY_DAYS);
      const nearExpiry = values.lines.filter((l) => {
        const e = toISODate(l.expiry_date);
        return e && !l.is_opening && e >= today && e <= soon;
      }).length;
      if (nearExpiry) {
        warnings.push(
          `${nearExpiry} line(s) expire within ${NEAR_EXPIRY_DAYS} days.`,
        );
      }

      if (
        warnings.length &&
        !window.confirm(
          `Please review before saving:\n\n• ${warnings.join("\n• ")}\n\nSave anyway?`,
        )
      ) {
        return;
      }

      const payload = {
        branch_id: Number(values.branch_id),
        supplier_id: Number(values.supplier_id),
        bill_no: String(values.bill_no).trim(),
        bill_date: toISODate(values.bill_date),
        tax_type: values.tax_type,
        settlement_amount: settlement,
        notes: values.notes?.trim() || null,
        is_lost: isBillLost ? 1 : 0,
        lines: values.lines.map((line) => {
          const discount = round2(num(line.discount));
          return {
            product_id: Number(line.product_id),
            qty: Number(line.qty),
            free_qty: Number(line.free_qty || 0),
            purchase_rate: round4(num(line.purchase_rate)),
            mrp: round2(num(line.mrp)),
            selling_price: round2(num(line.selling_price)),
            discount_type: discount > 0 ? line.discount_type : null,
            discount,
            gst_rate_id: Number(line.gst_rate_id),
            batch_no: String(line.batch_no || "").trim().toUpperCase() || null,
            expiry_date: toISODate(line.expiry_date) || null,
            hsn_code: String(line.hsn_code || "").trim() || null,
            is_opening: line.is_opening ? 1 : 0,
          };
        }),
        payments: values.payments.map((p) => ({
          amount: round2(num(p.amount)),
          method: p.method,
          reference: p.reference?.trim() || null,
          payment_date: toISODate(p.payment_date) || null,
        })),
      };

      if (isEdit) {
        await axios.put(`${BASE_URL}/api/purchase-bill/${id}`, payload, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        });

        toast.success("Purchase bill updated successfully!");
      } else {
        await axios.post(`${BASE_URL}/api/purchase-bill`, payload, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        });

        actions.resetForm();
        toast.success("Purchase bill saved successfully!");
      }

      appData?.invalidate("purchaseBills");
      await appData?.loadPurchaseBills();

      appData?.invalidate("products");
      appData?.invalidate("purchaseProducts");

      await appData?.loadProducts({ force: true });
      await appData?.loadPurchaseProducts({ force: true });

      navigate("/purchase-bill");
    } catch (error) {
      console.log(error.response?.data);
      const apiErrors = error.response?.data?.errors;
      const firstError = apiErrors ? Object.values(apiErrors).flat()[0] : null;
      toast.error(
        firstError ||
        error.response?.data?.message ||
        "Failed to save purchase bill. Please check the form.",
      );
    } finally {
      actions.setSubmitting(false);
    }
  };

  /* ---------- supplier modal ---------- */
  const closeSupplierModal = () => {
    setShowModal(false);
    setNewSupplier("");
    setSupplierState("");
    setError("");
    setStateError("");
    // "+ Add New Supplier" select me atka na rahe
    if (formikRef.current?.values?.supplier_id === "add_new") {
      formikRef.current.setFieldValue("supplier_id", "");
    }
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    if (savingSupplier) return;

    const { errors, value } = validateSupplierForm(
      newSupplier,
      supplierState,
      suppliers,
    );
    setError(errors.name || "");
    setStateError(errors.state || "");
    if (errors.name || errors.state) return;

    setSavingSupplier(true);
    try {
      const res = await axios({
        method: "post",
        url: `${BASE_URL}/api/suppliers`,
        data: { name: value, state: supplierState },
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      toast.success("Suppliers Created!");

      const created = res?.data?.supplier || res?.data?.data || res?.data;
      const createdId = created?.id ? String(created.id) : "";

      appData?.invalidate("suppliers");
      await appData?.loadSuppliers();

      setSupplierId(createdId);
      formikRef.current?.setFieldValue("supplier_id", createdId);

      setNewSupplier("");
      setSupplierState("");
      setError("");
      setStateError("");
      setShowModal(false);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const first = apiErrors ? Object.values(apiErrors).flat()[0] : null;
      setError(
        first || err.response?.data?.message || "Could not create the supplier.",
      );
    } finally {
      setSavingSupplier(false);
    }
  };

  const handlePurchaseBillImageScan = async (setFieldValue) => {
    if (!billImage) {
      toast.error("Please select a bill image first.");
      return;
    }

    // Image type / size check (backend tak bekar upload na jaye)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(billImage.type)) {
      toast.error("Only JPG, PNG or WEBP images are allowed.");
      return;
    }
    if (billImage.size > 8 * 1024 * 1024) {
      toast.error("Image is too large. Please upload a file under 8 MB.");
      return;
    }

    setIsScanningBill(true);

    try {
      const formData = new FormData();
      formData.append("bill_image", billImage);

      const response = await axios.post(
        `${BASE_URL}/api/purchase-bill/scan`,
        formData,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 90000,
        },
      );

      const bill = response?.data?.data;

      if (!response?.data?.status || !Array.isArray(bill?.lines)) {
        throw new Error("Invalid bill data received from AI.");
      }

      // Match supplier against existing database records.
      const normalizeName = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      const supplierMatch = suppliers.find(
        (supplier) =>
          normalizeName(supplier.name) === normalizeName(bill.supplier_name),
      );

      setFieldValue("supplier_id", supplierMatch?.id?.toString() || "");
      setFieldValue("bill_no", sanitizers.billNo(bill.bill_no || ""));
      setFieldValue("bill_date", toISODate(bill.bill_date) || "");

      if (["inclusive", "exclusive"].includes(bill.tax_type)) {
        setFieldValue("tax_type", bill.tax_type);
      }

      // Search the complete store product catalogue on the backend in one request.
      const matchResponse = await axios.post(
        `${BASE_URL}/api/products/match-for-purchase`,
        {
          lines: bill.lines.map((item, index) => ({
            line_index: index,
            product_name: item.product_name || "",
            sku: item.sku || "",
            barcode: item.barcode || "",
            salt_composition: item.salt_composition || "",
            manufacturer: item.manufacturer || "",
          })),
        },
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
          timeout: 60000,
        },
      );

      const matchResults = Array.isArray(matchResponse?.data?.data)
        ? matchResponse.data.data
        : [];

      // Keep all returned candidates available in the product dropdown,
      // including products that were not in the initially loaded first page.
      const returnedProducts = matchResults.flatMap((result) => [
        ...(result?.matched_product ? [result.matched_product] : []),
        ...(Array.isArray(result?.candidates) ? result.candidates : []),
      ]);
      cacheProducts(returnedProducts);

      const mappedLines = bill.lines.map((item, index) => {
        const matchResult = matchResults.find(
          (result) => Number(result.line_index) === index,
        );
        const productMatch = matchResult?.matched_product || null;

        const gstMatch = gstRates.find(
          (gst) => Number(gst.rate) === Number(item.gst_rate_percent),
        );

        return {
          product_id: productMatch?.id?.toString() || "",
          qty: item.qty ?? "",
          free_qty: item.free_qty ?? 0,
          purchase_rate: item.purchase_rate ?? "",
          mrp: item.mrp ?? "",
          selling_price: item.selling_price ?? "",
          discount_type:
            item.discount_type === "percent"
              ? "percent"
              : item.discount_type === "amount"
                ? "fixed"
                : "",
          discount: item.discount ?? 0,
          hsn_code: sanitizers.hsn(item.hsn_code || productMatch?.hsn_code || ""),
          gst_rate_id: gstMatch?.id?.toString() || "",
          batch_no: sanitizers.batch(item.batch_no || ""),
          // Avoid saving a potentially hallucinated expiry day.
          // Verify the original invoice and enter expiry manually.
          expiry_date: normalizeExpiryDate(item.expiry_date),
          is_opening: false,
        };
      });

      setFieldValue(
        "lines",
        mappedLines.length ? mappedLines : [emptyLine()],
      );

      // Do not set settlement_amount: it is the adjusted paid amount,
      // not the invoice's grand total.
      const unmatchedProducts = mappedLines.filter(
        (line) => !line.product_id,
      ).length;

      const unmatchedGst = mappedLines.filter(
        (line) => !line.gst_rate_id,
      ).length;

      if (!supplierMatch) {
        toast.warning(
          "Bill scanned, but supplier was not matched. Please select it manually.",
        );
      } else if (unmatchedProducts || unmatchedGst) {
        toast.warning(
          `${unmatchedProducts} product(s) and ${unmatchedGst} GST rate(s) need manual matching.`,
        );
      } else {
        toast.success("Bill scanned! Please verify the details before saving.");
      }
    } catch (error) {
      console.error("Purchase bill scan error:", error.response?.data || error);

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Could not scan the bill. Please try again.",
      );
    } finally {
      setIsScanningBill(false);
    }
  };

  const handleBarcodeScan = async (rawBarcode, values, push, setFieldValue) => {
    const barcode = String(rawBarcode || "").trim();
    if (!barcode) return;
    try {
      const response = await axios.post(
        `${BASE_URL}/api/sales/scan`,
        { barcode },
        { headers: { Authorization: `Bearer ${user_data.token}` } },
      );

      if (!response?.data?.status) {
        toast.error(response?.data?.message || "Product not found");
        return;
      }

      const product = response?.data?.product;

      if (!product || !product.id) {
        toast.error("Invalid product data received from server");
        return;
      }

      // Scanned product ko cache me daalo (50 ke bahar ka ho sakta hai)
      cacheProducts([product]);

      const inventory =
        response.data.batches?.find((b) => b.batch_barcode === barcode) || {};
      const linesArray = values?.lines || [];

      const existingIndex = linesArray.findIndex(
        (l) => l.product_id == product.id && l.batch_no === inventory.batch_no,
      );

      if (existingIndex !== -1) {
        setFieldValue(
          `lines.${existingIndex}.qty`,
          Number(linesArray[existingIndex]?.qty || 0) + 1,
        );
        setBarcode("");
        return;
      }

      const emptyIndex = linesArray.findIndex((l) => !l.product_id);

      // Stock of loose-enabled products is stored per single unit,
      // but a purchase line is entered per pack.
      const perPack =
        Number(inventory.units_per_pack) > 1
          ? Number(inventory.units_per_pack)
          : 1;
      const toPack = (value) =>
        Math.round(Number(value || 0) * perPack * 100) / 100;

      const lineData = {
        product_id: product.id.toString(),
        qty: 1,
        free_qty: 0,
        purchase_rate: inventory.purchase_rate ?? toPack(inventory.cost_price),
        mrp: toPack(inventory.mrp),
        selling_price: toPack(inventory.selling_price),
        hsn_code: sanitizers.hsn(product.hsn_code || ""),
        gst_rate_id: product.gst_rate?.id ? String(product.gst_rate.id) : "",
        batch_no: sanitizers.batch(inventory.batch_no || ""),
        expiry_date: toISODate(inventory.expiry_date) || "",
      };

      if (emptyIndex !== -1) {
        Object.entries(lineData).forEach(([key, value]) => {
          setFieldValue(`lines.${emptyIndex}.${key}`, value);
        });
      } else {
        push({ ...emptyLine(), ...lineData });
      }
      setBarcode("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      setBarcode("");
    }
  };

  const generateLostRef = () => {
    const now = new Date();
    const ymd = todayISO().replace(/-/g, "");
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `LOST-${ymd}-${time}`;
  };

  return (
    <Layout>
      <style>{ledgerStyles}</style>

      <div className="main-content-inner">
        <div className="main-content-wrap">
          <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            enableReinitialize={true}
            validationSchema={validationSchema}
            validateOnChange={true}
            validateOnBlur={true}
            validateOnMount={false}
            onSubmit={(values, actions) => handleSubmit(values, actions)}
          >

            {({ values, setFieldValue, errors }) => {
              const grandTotal = calcGrandTotal(values);
              const effectiveTotal = effectiveTotalOf(values);

              // Payments log total
              const paidTotal = (values.payments || []).reduce(
                (acc, p) => acc + (Number(p.amount) || 0),
                0,
              );

              // Due Amount Calculation (with tolerance rounding for floating point division)
              const rawDue = effectiveTotal - paidTotal;
              const dueAmount =
                rawDue > 0.5 ? Math.round(rawDue * 100) / 100 : 0;

              // Status flags
              const isPaid =
                dueAmount === 0 && (paidTotal > 0 || effectiveTotal > 0);
              const isPartial = paidTotal > 0 && dueAmount > 0;

              return (
                <div className="pb-page">
                  <div className="pb-header-strip">
                    <div>
                      <p className="pb-header-eyebrow">
                        Purchases &amp; Stock Inward
                      </p>
                      <h3>
                        {isEdit ? "Edit Purchase Bill" : "Create Purchase Bill"}
                      </h3>
                    </div>

                    {isEdit && (
                      <div>
                        {isPaid && (
                          <span className="status-badge paid">
                            <i className="fa fa-check-circle mr-1"></i> Fully
                            Paid
                          </span>
                        )}
                        {isPartial && (
                          <span className="status-badge partial">
                            <i className="fa fa-clock-o mr-1"></i> Partially
                            Paid
                          </span>
                        )}
                        {!isPaid && !isPartial && (
                          <span className="status-badge due">
                            <i className="fa fa-exclamation-circle mr-1"></i>{" "}
                            Unpaid / Due
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Form
                    noValidate
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target;
                        if (
                          target.id === "barcode-input" ||
                          target.tagName === "TEXTAREA" ||
                          target.type === "submit"
                        ) {
                          return;
                        }
                        e.preventDefault();
                        const formElements = Array.from(
                          e.currentTarget.querySelectorAll(
                            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]',
                          ),
                        );
                        const index = formElements.indexOf(target);
                        if (index > -1 && index < formElements.length - 1) {
                          formElements[index + 1].focus();
                        }
                      }
                    }}
                  >
                    <ScrollToFirstError />

                    {!isEdit && (
                      <div className="pb-card">
                        <p className="pb-section-label">AI Bill Scanner</p>

                        <div className="flex flex-col gap-3">
                          {/* YAHAN IMAGE SELECT KARNE WALA INPUT HAI */}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) =>
                              setBillImage(e.target.files?.[0] || null)
                            }
                            className="block w-full rounded-lg border border-gray-300 p-3"
                          />

                          <button
                            type="button"
                            disabled={!billImage || isScanningBill}
                            onClick={() =>
                              handlePurchaseBillImageScan(setFieldValue)
                            }
                            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                          >
                            {isScanningBill
                              ? "Scanning Bill..."
                              : "Scan Bill with AI"}
                          </button>
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                          Pehle bill ki image select karo, phir Scan Bill dabao.
                        </p>
                      </div>
                    )}
                    <div className="pb-card">
                      <p className="pb-section-label">Bill Details</p>
                      <div className="row mb-0">
                        <div className="mb-20 col-md-2">
                          <label className="pb-field-label">Branch</label>
                          <Field as="select" name="branch_id">
                            <option value="">Select Branch</option>
                            {branches?.map((b) => (
                              <option key={b.id} value={b.id}>
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
                          <label className="pb-field-label">Supplier</label>
                          <Field name="supplier_id" as="select">
                            {({ field }) => (
                              <select
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const value = e.target.value;
                                  if (value === "add_new") setShowModal(true);
                                  setSupplierId(value);
                                }}
                              >
                                <option value="">Select Supplier</option>
                                {!newSupplier && (
                                  <option value="add_new">
                                    + Add New Supplier
                                  </option>
                                )}
                                {suppliers.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </Field>
                          <ErrorMessage
                            name="supplier_id"
                            className="error-text"
                            component="div"
                          />
                        </div>

                        <div className="mb-20 col-md-2">
                          <label className="pb-field-label">Bill Date</label>
                          <FormikDatePicker type="date" name="bill_date" />
                          <ErrorMessage
                            name="bill_date"
                            className="error-text"
                            component="div"
                          />
                        </div>

                        <div className="mb-0 col-md-4">
                          <label className="pb-field-label">Bill No</label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <div
                              className={`lost-bill-wrapper${isBillLost ? " active" : ""}`}
                            >
                              <label
                                className="toggle-switch"
                                htmlFor="lost-toggle"
                              >
                                <input
                                  type="checkbox"
                                  id="lost-toggle"
                                  checked={isBillLost}
                                  onChange={(e) => {
                                    const lost = e.target.checked;
                                    setIsBillLost(lost);
                                    setFieldValue(
                                      "bill_no",
                                      lost ? generateLostRef() : "",
                                    );
                                  }}
                                />
                                <span className="toggle-track"></span>
                              </label>
                              <label
                                htmlFor="lost-toggle"
                                className="toggle-label-text"
                              >
                                {isBillLost ? "⚠ Lost" : "Bill available"}
                              </label>
                            </div>

                            <div style={{ flex: 1 }}>
                              <LiveFormikField
                                type="text"
                                name="bill_no"
                                maxLength={20}
                                autoComplete="off"
                                sanitize={sanitizers.billNo}
                                className={isBillLost ? "lost-bill-input" : ""}
                                placeholder={
                                  isBillLost
                                    ? "Auto-generated reference"
                                    : "Enter bill no"
                                }
                                disabled={isBillLost}
                              />
                              <ErrorMessage
                                name="bill_no"
                                className="error-text"
                                component="div"
                              />
                            </div>
                          </div>

                          {isBillLost && (
                            <div className="lost-bill-hint">
                              <span>
                                You can update the real bill no. later from the
                                bills list once supplier sends a copy.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pb-card">
                      <p className="pb-section-label">Line Items</p>
                      <FieldArray name="lines">
                        {({ push, remove }) => (
                          <>
                            <input
                              id="barcode-input"
                              className="pb-barcode-input"
                              type="text"
                              maxLength={50}
                              autoComplete="off"
                              value={barcode}
                              onChange={(e) => setBarcode(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleBarcodeScan(
                                    barcode,
                                    values,
                                    push,
                                    setFieldValue,
                                  );
                                }
                              }}
                              placeholder="⌁ Scan barcode to auto-fill a line"
                            />

                            <div className="pb-lines-scroll">
                              {values?.lines?.map((line, index) => {
                                const lineProduct = findProduct(line.product_id);
                                const isWeight =
                                  lineProduct?.sale_type === "weight";
                                const qtyDecimals = isWeight ? 3 : 0;

                                return (
                                  <div
                                    key={index}
                                    className={`pb-line-row${line.is_opening ? " is-opening" : ""}${showBatch ? " with-batch" : ""}`}
                                  >
                                    <div className="field-col">
                                      <small className="field-label">
                                        Product
                                      </small>
                                      <Field name={`lines.${index}.product_id`}>
                                        {({ field, form }) => (
                                          <ProductSearchSelect
                                            value={field.value}
                                            selectedProduct={lineProduct}
                                            onAddNew={() => {
                                              setShowProductModal(true);
                                              setActiveRowIndex(index);
                                            }}
                                            onSelect={(selectedProduct) => {
                                              // selected product ko cache me daalo taaki
                                              // findProduct() ise dhundh sake
                                              cacheProducts([selectedProduct]);

                                              form.setFieldValue(
                                                field.name,
                                                String(selectedProduct.id),
                                              );

                                              if (
                                                selectedProduct.sale_type ===
                                                "weight" &&
                                                selectedProduct.price_per_kg
                                              ) {
                                                form.setFieldValue(
                                                  `lines.${index}.selling_price`,
                                                  selectedProduct.price_per_kg,
                                                );
                                              }
                                            }}
                                          />
                                        )}
                                      </Field>
                                      <ErrorMessage
                                        name={`lines.${index}.product_id`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">Qty</small>
                                      <LiveFormikField
                                        type="number"
                                        decimals={qtyDecimals}
                                        name={`lines.${index}.qty`}
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.qty`}
                                        component="div"
                                        className="field-error"
                                      />
                                      {(() => {
                                        const perPack = Number(
                                          lineProduct?.units_per_pack,
                                        );
                                        if (
                                          !lineProduct ||
                                          lineProduct.allow_loose != 1 ||
                                          !(perPack >= 2)
                                        ) {
                                          return null;
                                        }
                                        const unit =
                                          lineProduct.loose_unit || "tablet";
                                        const label =
                                          unit === "ml" ? "ml" : `${unit}s`;
                                        const packs = Number(line.qty) || 1;
                                        return (
                                          <small
                                            style={{
                                              fontSize: 10,
                                              lineHeight: 1.2,
                                              marginTop: 3,
                                              color: "#16a34a",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {Number(line.qty) ? "=" : "1 pack ="}{" "}
                                            {packs * perPack} {label}
                                          </small>
                                        );
                                      })()}
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">Free</small>
                                      <LiveFormikField
                                        type="number"
                                        decimals={qtyDecimals}
                                        name={`lines.${index}.free_qty`}
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.free_qty`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">Rate</small>
                                      <LiveFormikField
                                        type="number"
                                        decimals={4}
                                        name={`lines.${index}.purchase_rate`}
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.purchase_rate`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">MRP</small>
                                      <LiveFormikField
                                        type="number"
                                        decimals={2}
                                        name={`lines.${index}.mrp`}
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.mrp`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">SP</small>
                                      <LiveFormikField
                                        type="number"
                                        decimals={2}
                                        name={`lines.${index}.selling_price`}
                                        disabled={isWeight}
                                        title={
                                          isWeight
                                            ? "Auto-filled from product's price per kg"
                                            : undefined
                                        }
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.selling_price`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">
                                        Disc Type
                                      </small>
                                      <Field
                                        as="select"
                                        name={`lines.${index}.discount_type`}
                                      >
                                        <option value="">–</option>
                                        <option value="percent">%</option>
                                        <option value="fixed">₹</option>
                                      </Field>
                                      <ErrorMessage
                                        name={`lines.${index}.discount_type`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">
                                        Discount
                                      </small>
                                      <LiveFormikField
                                        type="number"
                                        decimals={2}
                                        name={`lines.${index}.discount`}
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.discount`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">GST %</small>
                                      <Field
                                        as="select"
                                        name={`lines.${index}.gst_rate_id`}
                                      >
                                        <option value="">–</option>
                                        {gstRates.map((g) => (
                                          <option key={g.id} value={g.id}>
                                            {g.rate}%
                                          </option>
                                        ))}
                                      </Field>
                                      <ErrorMessage
                                        name={`lines.${index}.gst_rate_id`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    {showBatch && (
                                      <div className="field-col">
                                        <small className="field-label">
                                          Batch No{isPharmacy ? " *" : ""}
                                        </small>
                                        <LiveFormikField
                                          type="text"
                                          name={`lines.${index}.batch_no`}
                                          maxLength={50}
                                          autoComplete="off"
                                          sanitize={sanitizers.batch}
                                          placeholder={
                                            isPharmacy
                                              ? "Batch no"
                                              : "Batch no / Blank"
                                          }
                                          style={{ textTransform: "uppercase" }}
                                        />
                                        <ErrorMessage
                                          name={`lines.${index}.batch_no`}
                                          component="div"
                                          className="field-error"
                                        />
                                      </div>
                                    )}

                                    <div className="field-col">
                                      <small className="field-label">
                                        Expiry{isPharmacy ? " *" : ""}
                                      </small>
                                      <FormikDatePicker
                                        name={`lines.${index}.expiry_date`}
                                        placeholder="dd-mm-yyyy"
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.expiry_date`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <div className="field-col">
                                      <small className="field-label">HSN</small>
                                      <LiveFormikField
                                        type="text"
                                        name={`lines.${index}.hsn_code`}
                                        maxLength={8}
                                        inputMode="numeric"
                                        autoComplete="off"
                                        sanitize={sanitizers.hsn}
                                      />
                                      <ErrorMessage
                                        name={`lines.${index}.hsn_code`}
                                        component="div"
                                        className="field-error"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      className="pb-remove-btn"
                                      onClick={() => remove(index)}
                                      title="Remove line"
                                      disabled={values.lines.length === 1}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            {typeof errors.lines === "string" && (
                              <div className="error-text">{errors.lines}</div>
                            )}

                            <button
                              type="button"
                              className="pb-add-product-btn"
                              disabled={values.lines.length >= MAX_LINES}
                              onClick={() => {
                                const newIndex = values.lines.length;
                                push(emptyLine());
                                setTimeout(() => {
                                  document
                                    .querySelector(
                                      `input[name="lines.${newIndex}.qty"]`,
                                    )
                                    ?.focus();
                                }, 50);
                              }}
                            >
                              + Add Product Line
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>

                    <div className="pb-card">
                      <p className="pb-section-label">
                        Billing &amp; Settlement
                      </p>
                      <div className="row mb-0">
                        <div className="mb-20 col-md-4">
                          <label className="pb-field-label">
                            Tax Billing Type
                          </label>
                          <div className="pb-tax-toggle">
                            <button
                              type="button"
                              className={`pb-tax-btn${values.tax_type === "exclusive" ? " active-exclusive" : ""}`}
                              onClick={() =>
                                setFieldValue("tax_type", "exclusive")
                              }
                            >
                              <i className="fa fa-plus-circle"></i>
                              Exclusive (+)
                            </button>
                            <button
                              type="button"
                              className={`pb-tax-btn${values.tax_type === "inclusive" ? " active-inclusive" : ""}`}
                              onClick={() =>
                                setFieldValue("tax_type", "inclusive")
                              }
                            >
                              <i className="fa fa-arrow-circle-down"></i>
                              Inclusive (In)
                            </button>
                          </div>
                          <ErrorMessage
                            name="tax_type"
                            className="error-text"
                            component="div"
                          />
                        </div>

                        <div className="mb-20 col-md-4">
                          <label className="pb-field-label">
                            Settlement Amount (Final Adjusted Paid)
                          </label>
                          <LiveFormikField
                            type="number"
                            decimals={2}
                            name="settlement_amount"
                            placeholder="e.g., 722"
                          />
                          <ErrorMessage
                            name="settlement_amount"
                            className="error-text"
                            component="div"
                          />
                        </div>

                        <div className="mb-0 col-md-4">
                          <label className="pb-field-label">
                            Bill Remarks / Ledger Notes
                          </label>
                          <Field
                            as="textarea"
                            name="notes"
                            maxLength={500}
                            placeholder="Enter settlement remarks or adjustment details..."
                          />
                          <ErrorMessage
                            name="notes"
                            component="div"
                            className="error-text"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pb-card">
                      <p className="pb-section-label">Payments Ledger</p>

                      {isEdit && (
                        <>
                          {dueAmount > 0 ? (
                            <div className="payment-summary-box due-bg text-2xl">
                              <span>
                                <i className="fa fa-info-circle mr-2"></i> Due
                                Bill Amount Pending:
                              </span>
                              <span style={{ fontSize: "16px" }}>
                                ₹{formatAmount(dueAmount)}
                              </span>
                            </div>
                          ) : (
                            <div className="payment-summary-box paid-bg text-2xl">
                              <span>
                                <i className="fa fa-check-circle mr-2"></i> Bill
                                Fully Settled:
                              </span>
                              <span>
                                Paid Details Logged: ₹{formatAmount(paidTotal)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <FieldArray name="payments">
                        {({ push, remove }) => (
                          <>
                            {values.payments?.map((payment, pIndex) => (
                              <div key={pIndex} className="payment-row">
                                <div style={{ flex: 1 }}>
                                  <label className="pb-field-label">
                                    Method
                                  </label>
                                  <Field
                                    as="select"
                                    name={`payments.${pIndex}.method`}
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="online">Online</option>
                                    <option value="bank">Bank</option>
                                  </Field>
                                  <ErrorMessage
                                    name={`payments.${pIndex}.method`}
                                    component="div"
                                    className="error-text"
                                  />
                                </div>

                                <div style={{ flex: 1 }}>
                                  <label className="pb-field-label">
                                    Amount
                                  </label>
                                  <LiveFormikField
                                    type="number"
                                    decimals={2}
                                    name={`payments.${pIndex}.amount`}
                                    placeholder="0.00"
                                  />
                                  <ErrorMessage
                                    name={`payments.${pIndex}.amount`}
                                    component="div"
                                    className="error-text"
                                  />
                                </div>

                                <div style={{ flex: 1 }}>
                                  <label className="pb-field-label">
                                    Ref / Transaction ID
                                    {payment.method !== "cash" ? " *" : ""}
                                  </label>
                                  <LiveFormikField
                                    type="text"
                                    name={`payments.${pIndex}.reference`}
                                    placeholder="Ref No."
                                    maxLength={50}
                                    autoComplete="off"
                                    sanitize={sanitizers.reference}
                                  />
                                  <ErrorMessage
                                    name={`payments.${pIndex}.reference`}
                                    component="div"
                                    className="error-text"
                                  />
                                </div>

                                <div style={{ flex: 1 }}>
                                  <label className="pb-field-label">
                                    Payment Date
                                  </label>
                                  <FormikDatePicker
                                    name={`payments.${pIndex}.payment_date`}
                                    placeholder="dd-mm-yyyy"
                                  />
                                  <ErrorMessage
                                    name={`payments.${pIndex}.payment_date`}
                                    component="div"
                                    className="error-text"
                                  />
                                </div>

                                <button
                                  type="button"
                                  className="pb-remove-btn"
                                  style={{ marginTop: "20px" }}
                                  onClick={() => remove(pIndex)}
                                  title="Remove payment"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="mt-4 text-blue-600 font-semibold text-2xl hover:text-blue-700 transition"
                              onClick={() =>
                                push({
                                  method: "cash",
                                  amount: dueAmount > 0 ? dueAmount : "",
                                  reference: "",
                                  payment_date: todayISO(),
                                })
                              }
                            >
                              + Add Payment Entry
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>

                    <div className="pb-bottom-row">
                      <button type="submit" className="ml-5 tf-button style-1">
                        {isEdit ? "Update Bill" : "Save Bill"}
                      </button>

                      <button type="button" className="ml-5 tf-button style-1">
                        <a
                          href="/purchase-bill"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {" "}
                          Cancel
                        </a>
                      </button>

                      <div className="pb-total-bar">
                        <div className="pb-total-label">
                          <div className="pb-total-icon">
                            <i className="fa fa-calculator"></i>
                          </div>
                          <span>Calculated Bill Invoice Total</span>
                        </div>
                        <div className="pb-total-amount">
                          <small>₹</small>
                          <span>{formatAmount(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </Form>
                </div>
              );
            }}
          </Formik>

          {/* Supplier Modal */}
          {showModal && (
            <div className="pb-modal-overlay" onClick={closeSupplierModal}>
              <div
                className="pb-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pb-modal-header">
                  <h5>Add New Supplier</h5>
                </div>
                <div className="pb-modal-body">
                  <p className="input-name">Add Supplier Name</p>
                  <input
                    id="small-popup"
                    type="text"
                    className={error ? "is-invalid" : ""}
                    placeholder="Supplier Name"
                    maxLength={100}
                    autoComplete="off"
                    value={newSupplier}
                    onChange={(e) => {
                      setNewSupplier(e.target.value);
                      if (error) setError("");
                    }}
                  />
                  {error && <div className="error-text">{error}</div>}

                  <p className="input-name">Select State</p>
                  <select
                    className="state"
                    value={supplierState}
                    onChange={(e) => {
                      setSupplierState(e.target.value);
                      if (stateError) setStateError("");
                    }}
                    name="state"
                    id="state"
                  >
                    <option value="">Select state</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Andaman and Nicobar Islands">
                      Andaman and Nicobar Islands
                    </option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">
                      Dadra and Nagar Haveli and Daman and Diu
                    </option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Puducherry">Puducherry</option>
                  </select>
                  {stateError && <div className="error-text">{stateError}</div>}
                </div>
                <div className="pb-modal-footer">
                  <button
                    type="button"
                    className="pb-btn-cancel"
                    onClick={closeSupplierModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pb-btn-save"
                    disabled={!newSupplier.trim() || savingSupplier}
                    onClick={(e) => saveSupplier(e)}
                  >
                    {savingSupplier ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showProductModal && (
            <div
              className="pb-modal-overlay"
              onClick={() => setShowProductModal(false)}
            >
              <div
                className="pb-modal-card"
                style={{ width: "800px", maxHeight: "90vh", overflowY: "auto" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pb-modal-header">
                  <h5>Create Product</h5>
                </div>
                <div className="pb-modal-body">
                  <ProductForm
                    onSuccess={async (product) => {
                      // Naya product seedha cache me, dobara list load karne ki zaroorat nahi
                      cacheProducts([product]);

                      if (formikRef.current && activeRowIndex !== null) {
                        formikRef.current.setFieldValue(
                          `lines.${activeRowIndex}.product_id`,
                          String(product.id),
                        );
                      }

                      setShowProductModal(false);
                    }}
                    onCancel={() => setShowProductModal(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditPurchaseBill;