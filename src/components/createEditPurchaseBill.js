import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import ProductForm from "./ProductForm";
import { useAppData } from "../context/AppDataContext";
import FormikDatePicker from "./FormikDatePicker";

const ledgerStyles = `
  :root {
    --pb-navy: #6B5B45;
    --pb-navy-soft: #8A7860;
    --pb-ivory: #FBF9F5;
    --pb-paper: #FFFFFF;
    --pb-gold: #C89B4A;
    --pb-gold-soft: #F3E6C8;
    --pb-text: #3D3527;
    --pb-muted: #8A8170;
    --pb-border: #ECE6D8;
    --pb-border-strong: #E2D9C4;
    --pb-green: #3E9C76;
    --pb-green-bg: #EEFAF3;
    --pb-red: #D1655A;
    --pb-red-bg: #FDEEEC;
  }

  .pb-page {
    background: var(--pb-ivory);
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
    padding: 22px 24px;
    margin-bottom: 20px;
    box-shadow: 0 1px 2px rgba(15, 27, 46, 0.04);
  }

  .pb-section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--pb-gold);
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
  .pb-page input:disabled { background: #F3F1EC; color: var(--pb-muted); }

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
    background: #FFFBF2 !important;
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
    background: var(--pb-ivory);
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
  .pb-tax-btn.active-exclusive { background: var(--pb-gold); color: #fff; box-shadow: 0 2px 6px rgba(200,155,74,0.3); }
  .pb-tax-btn.active-inclusive { background: var(--pb-green); color: #fff; box-shadow: 0 2px 6px rgba(62,156,118,0.3); }

  .pb-total-bar {
    padding: 18px 26px;
    border-radius: 12px;
    background: linear-gradient(135deg, #FFFDF8 0%, var(--pb-gold-soft) 100%);
    border: 1px solid var(--pb-border-strong);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 14px rgba(200, 155, 74, 0.1);
  }
  .pb-total-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pb-total-icon {
    width: 34px; height: 34px;
    background: var(--pb-gold);
    color: #fff;
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
    align-items: center;
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

const CreateEditPurchaseBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const history = useHistory();
  const appData = useAppData();
  const branches = appData?.managerBranches || [];
  const [suppliers, setSupplierBill] = useState([]);
  const [products, setProducts] = useState([]);
  const [gstRates, setGstRates] = useState([]);
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
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_purchase_bill = localStorage.getItem("purchase_bills_create");
  const incomingBill = store_purchase_bill
    ? JSON.parse(store_purchase_bill)
    : null;
  const isEdit = Boolean(id);

  const [initialValues, setInitialValues] = useState({
    branch_id: "",
    supplier_id: "",
    bill_no: "",
    bill_date: "",
    tax_type: "exclusive",
    settlement_amount: "",
    notes: "",
    is_lost: 0,
    lines: [
      {
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
      },
    ],
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
    }
  };

  useEffect(() => {
    if (isEdit) {
      fetchPurchaseBillById();
    } else if (incomingBill) {
      setBillInitialValues(incomingBill);
    }
  }, [incomingBill, isEdit, id]);

  const fetchBranch = () => {
    appData?.loadManagerBranches();
  };

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
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/all-products`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      const sortedProducts = (response.data.products || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      );
      setProducts(sortedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
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

  useEffect(() => {
    fetchBranch();
    fetchSupplierBill();
    fetchProduct();
    fetchGstRates();
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

  const parseDateString = (value, originalValue) => {
    if (typeof originalValue === "string" && originalValue.trim() !== "") {
      const parts = originalValue.split("-");
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
      }
    }
    return value;
  };

  const validationSchema = Yup.object().shape({
    branch_id: Yup.string().required("Branch is required"),
    supplier_id: Yup.string().required("Supplier is required"),
    bill_no: Yup.string().required("Bill No is required"),
    bill_date: Yup.date()
      .transform(parseDateString)
      .typeError("Invalid date format")
      .required("Bill date is required"),
    tax_type: Yup.string().oneOf(["inclusive", "exclusive"]).required(),
    settlement_amount: Yup.number().nullable().min(0, "Cannot be negative"),
    notes: Yup.string().nullable(),
    lines: Yup.array()
      .min(1, "At least one product is required")
      .of(
        Yup.object().shape({
          product_id: Yup.string().required("Product is required"),
          qty: Yup.number()
            .typeError("Quantity must be a number")
            .required("Qty required")
            .min(0.0001, "Qty must be greater than 0"),
          free_qty: Yup.number()
            .nullable()
            .typeError("Free Qty must be a number")
            .min(0, "Free Qty cannot be negative"),
          purchase_rate: Yup.number()
            .typeError("Purchase rate must be a number")
            .required("Purchase rate required")
            .min(0, "Rate cannot be negative"),
          mrp: Yup.number()
            .typeError("MRP must be a number")
            .required("MRP required")
            .min(0, "MRP cannot be negative"),
          selling_price: Yup.number()
            .typeError("Selling price must be a number")
            .required("Selling price required")
            .min(0, "Selling price cannot be negative"),
          discount_type: Yup.string()
            .nullable()
            .oneOf(["percent", "fixed", ""]),
          discount: Yup.number().nullable().min(0, "Cannot be negative"),
          gst_rate_id: Yup.string().required("GST rate required"),
          expiry_date: Yup.date().transform(parseDateString).nullable(),
          is_opening: Yup.boolean().default(false),
        }),
      ),
    payments: Yup.array().of(
      Yup.object().shape({
        amount: Yup.number()
          .required("Amount is required")
          .min(0.01, "Min amount is 0.01"),
        method: Yup.string()
          .required("Method is required")
          .oneOf(["cash", "online", "bank"], "Invalid payment method"),
        reference: Yup.string().nullable(),
        payment_date: Yup.date().transform(parseDateString).nullable(),
      }),
    ),
  });

  const handleSubmit = async (values, actions) => {
    try {
      const payload = {
        branch_id: Number(values.branch_id),
        supplier_id: Number(values.supplier_id),
        bill_no: values.bill_no,
        bill_date: values.bill_date,
        tax_type: values.tax_type,
        settlement_amount:
          values.settlement_amount !== "" && values.settlement_amount != null
            ? Number(values.settlement_amount)
            : null,
        notes: values.notes?.trim() || null,
        is_lost: isBillLost ? 1 : 0,
        lines: values.lines.map((line) => ({
          product_id: Number(line.product_id),
          qty: Number(line.qty),
          free_qty: Number(line.free_qty || 0),
          purchase_rate: Number(line.purchase_rate),
          mrp: Number(line.mrp),
          selling_price: Number(line.selling_price),
          discount_type: line.discount_type || null,
          discount: line.discount ? Number(line.discount) : 0,
          gst_rate_id: Number(line.gst_rate_id),
          batch_no: line.batch_no || null,
          expiry_date: line.expiry_date || null,
          hsn_code: line.hsn_code || null,
          is_opening: line.is_opening ? 1 : 0,
        })),
        payments: values.payments.map((p) => ({
          amount: Number(p.amount),
          method: p.method,
          reference: p.reference?.trim() || null,
          payment_date: p.payment_date || null,
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
      history.push("/purchase-bill");
    } catch (error) {
      console.log(error.response?.data);
      toast.error(
        error.response?.data?.message ||
          "Failed to save purchase bill. Please check the form.",
      );
    } finally {
      actions.setSubmitting(false);
    }
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    if (newSupplier.trim().length < 3) {
      setError("Supplier name must be at least 3 characters.");
      return;
    }
    setError("");
    const supplier = {
      id: Date.now(),
      name: newSupplier.trim(),
      state: supplierState,
    };
    await axios({
      method: "post",
      url: `${BASE_URL}/api/suppliers`,
      data: supplier,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    toast.success("Suppliers Created!");
    setSupplierId(supplier.id);
    setNewSupplier("");
    setSupplierState("");
    setShowModal(false);
    fetchSupplierBill();
  };

  const handleBarcodeScan = async (barcode, values, push, setFieldValue) => {
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
      const lineData = {
        product_id: product.id.toString(),
        qty: 1,
        free_qty: 0,
        purchase_rate: inventory.purchase_rate ?? inventory.cost_price ?? 0,
        mrp: inventory.mrp || 0,
        selling_price: inventory.selling_price || 0,
        hsn_code: product.hsn_code || "",
        gst_rate_id: product.gst_rate?.id || "",
        batch_no: inventory.batch_no || "",
        expiry_date: inventory.expiry_date || "",
      };

      if (emptyIndex !== -1) {
        Object.entries(lineData).forEach(([key, value]) => {
          setFieldValue(`lines.${emptyIndex}.${key}`, value);
        });
      } else {
        push(lineData);
      }
      setBarcode("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      setBarcode("");
    }
  };

  const generateLostRef = () => {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
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
            onSubmit={(values, actions) => handleSubmit(values, actions)}
          >
            {({ values, setFieldValue }) => {
              const grandTotal = (values.lines || []).reduce((sum, line) => {
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
                  discountType === "percent"
                    ? grossValue * (discount / 100)
                    : discount;

                const taxable = Math.max(0, grossValue - discountAmount);
                const totalTax = (taxable * gstRate) / 100;

                return sum + (taxable + totalTax);
              }, 0);

              const effectiveTotal =
                values.settlement_amount !== "" &&
                values.settlement_amount != null &&
                !isNaN(Number(values.settlement_amount))
                  ? Number(values.settlement_amount)
                  : incomingBill?.total_amount
                    ? Number(incomingBill.total_amount)
                    : grandTotal;

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

                    {/* Dynamic Status Badges */}
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
                    {/* Bill Details */}
                    <div className="pb-card">
                      <p className="pb-section-label">Bill Details</p>
                      <div className="row mb-0">
                        <div className="mb-20 col-md-4">
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

                        <div className="mb-20 col-md-4">
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
                                {suppliers.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                                {!newSupplier && (
                                  <option value="add_new">
                                    + Add New Supplier
                                  </option>
                                )}
                              </select>
                            )}
                          </Field>
                          <ErrorMessage
                            name="supplier_id"
                            className="error-text"
                            component="div"
                          />
                        </div>

                        <div className="mb-20 col-md-4">
                          <label className="pb-field-label">Bill Date</label>
                          <FormikDatePicker type="date" name="bill_date" />
                          <ErrorMessage
                            name="bill_date"
                            className="error-text"
                            component="div"
                          />
                        </div>
                      </div>

                      <div className="row mb-0">
                        <div className="mb-0 col-md-6">
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
                              <Field
                                type="text"
                                name="bill_no"
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

                    {/* Line Items */}
                    <div className="pb-card">
                      <p className="pb-section-label">Line Items</p>
                      <FieldArray name="lines">
                        {({ push, remove }) => (
                          <>
                            <input
                              id="barcode-input"
                              className="pb-barcode-input"
                              type="text"
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
                              {values?.lines?.map((line, index) => (
                                <div
                                  key={index}
                                  className={`pb-line-row${line.is_opening ? " is-opening" : ""}`}
                                >
                                  <div className="field-col">
                                    <small className="field-label">
                                      Product
                                    </small>
                                    <Field name={`lines.${index}.product_id`}>
                                      {({ field, form }) => (
                                        <select
                                          {...field}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === "add_new") {
                                              setShowProductModal(true);
                                              setActiveRowIndex(index);
                                              return;
                                            }
                                            form.setFieldValue(
                                              field.name,
                                              value,
                                            );
                                          }}
                                        >
                                          <option value="">Select</option>
                                          {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
                                            </option>
                                          ))}
                                          <option value="add_new">
                                            + Add New Product
                                          </option>
                                        </select>
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
                                    <Field
                                      type="number"
                                      name={`lines.${index}.qty`}
                                    />
                                    <ErrorMessage
                                      name={`lines.${index}.qty`}
                                      component="div"
                                      className="field-error"
                                    />
                                  </div>

                                  <div className="field-col">
                                    <small className="field-label">Free</small>
                                    <Field
                                      type="number"
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
                                    <Field
                                      type="number"
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
                                    <Field
                                      type="number"
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
                                    <Field
                                      type="number"
                                      name={`lines.${index}.selling_price`}
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
                                    <Field
                                      type="number"
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

                                  <div className="field-col">
                                    <small className="field-label">
                                      Expiry
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
                                    <Field
                                      type="text"
                                      name={`lines.${index}.hsn_code`}
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
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              className="pb-add-product-btn"
                              onClick={() => {
                                const newIndex = values.lines.length;
                                push({
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

                    {/* Tax Type & Remarks */}
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
                        </div>

                        <div className="mb-20 col-md-4">
                          <label className="pb-field-label">
                            Settlement Amount (Final Adjusted Paid)
                          </label>
                          <Field
                            type="number"
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
                            rows="1"
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

                    {/* Split Payments & Due/Paid Status Card */}
                    <div className="pb-card">
                      <p className="pb-section-label">Payments Ledger</p>

                      {/* Dynamic Due / Paid Info Banner in Edit Mode */}
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
                                  <Field
                                    type="number"
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
                                  </label>
                                  <Field
                                    type="text"
                                    name={`payments.${pIndex}.reference`}
                                    placeholder="Ref No."
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
                                  payment_date: "",
                                })
                              }
                            >
                              + Add Payment Entry
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>

                    {/* Actions & Summary */}
                    <div className="pb-bottom-row">
                      <button type="submit" className="pb-submit-btn">
                        {isEdit ? "Update Bill" : "Save Bill"}
                      </button>

                      <button type="button" className="ml-5">
                        <a href="/purchase-bill"> Cancel</a>
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
            <div
              className="pb-modal-overlay"
              onClick={() => setShowModal(false)}
            >
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
                    onChange={(e) => setSupplierState(e.target.value)}
                    name="state"
                    id="state"
                  >
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
                <div className="pb-modal-footer">
                  <button
                    className="pb-btn-cancel"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="pb-btn-save"
                    disabled={!newSupplier.trim()}
                    onClick={(e) => saveSupplier(e)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product Modal */}
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
                    onSuccess={(product) => {
                      setProducts((prev) => [...prev, product]);
                      if (formikRef.current && activeRowIndex !== null) {
                        formikRef.current.setFieldValue(
                          `lines.${activeRowIndex}.product_id`,
                          product.id,
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
