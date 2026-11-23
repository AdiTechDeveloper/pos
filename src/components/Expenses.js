import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";
import Layout from "./layout";
import { useAppData } from "../context/AppDataContext";
import { hasFeature } from "../utils/hasFeature";
import { invalidateDashboardCache } from "./Dashboardcache";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

// "from" = jis balance se paisa minus hoga (backend yehi logic apply karega)
const PAYMENT_MODES = [
  { value: "cash", label: "Cash", hint: "From cash in hand" },
  { value: "upi", label: "UPI / Bank transfer", hint: "From bank balance" },
];

// Purane entries (bank / card) ko bhi sahi label milta hai
const LEGACY_MODE_LABEL = { bank: "Bank transfer", card: "Card" };

const RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom dates" },
];

/* ---------- validation limits ---------- */
const MAX_AMOUNT = 99999999.99; // DECIMAL(10,2) safe
const MIN_DATE = "2000-01-01";
const MAX_RANGE_DAYS = 366;
const PAID_TO_MAX = 120;
const REF_MAX = 60;
const NOTE_MAX = 300;
const CATEGORY_MIN = 3;
const CATEGORY_MAX = 50;
const SEARCH_MAX = 100;

const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s\-/_.#]*$/;
// Category name: sirf letters aur beech me single space (number / special character nahi)
const CATEGORY_PATTERN = /^\p{L}+(?: \p{L}+)*$/u;
const sanitizeCategoryInput = (v) =>
  String(v ?? "").replace(/[^\p{L}\s]/gu, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ");
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

// Form field order = screen order (pehla error wahi focus hoga)
const FIELD_ORDER = [
  "amount",
  "expense_date",
  "category_id",
  "payment_mode",
  "paid_to",
  "reference_no",
  "branch_id",
  "note",
];

const FOCUS_ID = {
  amount: "exp-amount",
  expense_date: "exp-date",
  category_id: "exp-category",
  payment_mode: "exp-pay-first",
  paid_to: "exp-paid-to",
  reference_no: "exp-ref",
  branch_id: "exp-branch",
  note: "exp-note",
};

const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

// Local date -> YYYY-MM-DD (toISOString nahi, warna subah 5:30 se pehle date ek din peeche aati hai)
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const todayStr = () => iso(new Date());

const parseISO = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Sirf format nahi, asli date bhi check hoti hai (2026-02-31 reject)
const isValidDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
};

const daysBetween = (from, to) =>
  Math.round((parseISO(to) - parseISO(from)) / 86400000) + 1;

const prettyDate = (value) => {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function getRange(key, customFrom, customTo) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (key === "today") return { from: iso(start), to: iso(start) };

  if (key === "yesterday") {
    const y = new Date(start);
    y.setDate(y.getDate() - 1);
    return { from: iso(y), to: iso(y) };
  }

  if (key === "this_week") {
    const monday = new Date(start);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return { from: iso(monday), to: iso(start) };
  }

  if (key === "this_month") {
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: iso(start),
    };
  }

  if (key === "last_month") {
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  return { from: customFrom, to: customTo };
}

const toArray = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.expenses)) return d.expenses;
  return [];
};

const errorText = (err, fallback) => {
  const errors = err?.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return err?.response?.data?.message || fallback;
};

// Backend (422) ke field-wise errors ko form fields se map karta hai
const serverFieldErrors = (err) => {
  const raw = err?.response?.data?.errors;
  const out = {};
  if (raw && typeof raw === "object") {
    Object.entries(raw).forEach(([key, val]) => {
      if (FIELD_ORDER.includes(key)) {
        out[key] = Array.isArray(val) ? val[0] : String(val);
      }
    });
  }
  return out;
};

const emptyForm = () => ({
  expense_date: todayStr(),
  category_id: "",
  amount: "",
  payment_mode: "cash",
  paid_to: "",
  reference_no: "",
  note: "",
  branch_id: "",
});

/* ---------- input cleaning ---------- */

const cleanText = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// Sirf digits + ek dot + max 2 decimals; e, -, + sab hat jaate hain
const sanitizeAmount = (raw) => {
  let v = String(raw ?? "").replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) {
    v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  }
  v = v.replace(/^0+(?=\d)/, "");
  return v.slice(0, 11);
};

const normalizeForm = (f) => ({
  ...f,
  amount: String(f.amount ?? "").trim(),
  expense_date: String(f.expense_date ?? "").trim(),
  paid_to: cleanText(f.paid_to),
  reference_no: cleanText(f.reference_no),
  note: String(f.note ?? "").trim(),
});

/* ---------- expense validation ---------- */

function validateExpense(rawForm, { categories, branches, showBranch }) {
  const f = normalizeForm(rawForm);
  const errors = {};

  // Amount
  if (!f.amount) {
    errors.amount = "Amount is required.";
  } else if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(f.amount)) {
    errors.amount = "Enter a valid amount (max 2 decimal places).";
  } else {
    const n = Number(f.amount);
    if (!(n > 0)) errors.amount = "Amount must be greater than zero.";
    else if (n > MAX_AMOUNT) {
      errors.amount = `Amount cannot be more than ${inr(MAX_AMOUNT)}.`;
    }
  }

  // Date
  if (!f.expense_date) {
    errors.expense_date = "Please choose the expense date.";
  } else if (!isValidDate(f.expense_date)) {
    errors.expense_date = "Enter a valid date.";
  } else if (f.expense_date > todayStr()) {
    errors.expense_date = "Expense date cannot be in the future.";
  } else if (f.expense_date < MIN_DATE) {
    errors.expense_date = `Date cannot be before ${prettyDate(MIN_DATE)}.`;
  }

  // Category
  if (!f.category_id) {
    errors.category_id = "Please select a category.";
  } else if (!categories.some((c) => String(c.id) === String(f.category_id))) {
    errors.category_id = "This category is not available. Select another one.";
  }

  // Payment mode
  if (!PAYMENT_MODES.some((m) => m.value === f.payment_mode)) {
    errors.payment_mode = "Choose how this was paid (Cash or UPI / Bank).";
  }

  // Paid to (optional)
  if (f.paid_to) {
    if (f.paid_to.length < 2) {
      errors.paid_to = "Paid To must be at least 2 characters.";
    } else if (f.paid_to.length > PAID_TO_MAX) {
      errors.paid_to = `Paid To can be at most ${PAID_TO_MAX} characters.`;
    } else if (!HAS_LETTER_OR_DIGIT.test(f.paid_to)) {
      errors.paid_to = "Paid To must contain letters or numbers.";
    }
  }

  // Reference no (optional)
  if (f.reference_no) {
    if (f.reference_no.length > REF_MAX) {
      errors.reference_no = `Reference no. can be at most ${REF_MAX} characters.`;
    } else if (!REF_PATTERN.test(f.reference_no)) {
      errors.reference_no =
        "Use only letters, numbers, spaces and - / _ . # in the reference no.";
    }
  }

  // Branch (sirf jab branch dropdown dikh raha ho)
  if (showBranch && f.branch_id) {
    if (!branches.some((b) => String(b.id) === String(f.branch_id))) {
      errors.branch_id = "Select a valid branch.";
    }
  }

  // Note (optional)
  if (f.note.length > NOTE_MAX) {
    errors.note = `Note can be at most ${NOTE_MAX} characters.`;
  }

  // Errors hamesha screen ke order me
  const ordered = {};
  FIELD_ORDER.forEach((k) => {
    if (errors[k]) ordered[k] = errors[k];
  });
  return ordered;
}

/* ---------- category name validation ---------- */

function validateCategoryName(raw, categories, excludeId = null) {
  const value = cleanText(raw);
  if (!value) return "Category name is required.";
  if (value.length < CATEGORY_MIN) {
    return `Category name must be at least ${CATEGORY_MIN} characters.`;
  }
  if (value.length > CATEGORY_MAX) {
    return `Category name can be at most ${CATEGORY_MAX} characters.`;
  }
  if (!CATEGORY_PATTERN.test(value)) {
    return "Category name can contain only letters and spaces (no numbers or special characters).";
  }
  const duplicate = categories.some(
    (c) =>
      String(c.id) !== String(excludeId) &&
      cleanText(c.name).toLowerCase() === value.toLowerCase(),
  );
  if (duplicate) return "A category with this name already exists.";
  return "";
}

const focusField = (key) => {
  requestAnimationFrame(() => {
    document.getElementById(FOCUS_ID[key])?.focus();
  });
};

/* ------------------------------------------------------------------ */
/*  Modal (same markup as the Category / Brand modals in other pages)   */
/* ------------------------------------------------------------------ */

function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card exp-modal-card"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h5>{title}</h5>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModeBadge({ mode }) {
  const label =
    PAYMENT_MODES.find((m) => m.value === mode)?.label ||
    LEGACY_MODE_LABEL[mode] ||
    mode ||
    "-";
  return (
    <span className={`exp-badge ${mode === "cash" ? "cash" : "bank"}`}>
      {label}
    </span>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <div id={id} className="exp-field-error" role="alert">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add / Edit expense                                                 */
/* ------------------------------------------------------------------ */

function ExpenseFormModal({
  initial,
  isEdit,
  categories,
  branches,
  showBranch,
  saving,
  error,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const amountRef = useRef(null);
  const ctx = { categories, branches, showBranch };

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const setFieldError = (key, message) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });

  // Value badalte hi us field ka purana error hat jaata hai / dobara check hota hai
  const update = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (errors[key]) setFieldError(key, validateExpense(next, ctx)[key]);
  };

  // Blur par check, par khaali field par nahi (Cancel dabate waqt error na chamke)
  const onBlurCheck = (key) => () => {
    if (!String(form[key] ?? "").trim()) return;
    setFieldError(key, validateExpense(form, ctx)[key]);
  };

  const field = (key, id) => ({
    id,
    className: `exp-input ${errors[key] ? "invalid" : ""}`,
    "aria-invalid": errors[key] ? "true" : undefined,
    "aria-describedby": errors[key] ? `${id}-err` : undefined,
  });

  const submit = async (addAnother) => {
    if (saving) return;

    const found = validateExpense(form, ctx);
    setErrors(found);
    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      focusField(firstKey);
      return;
    }

    const result = await onSubmit(normalizeForm(form), addAnother);

    if (result?.fieldErrors && Object.keys(result.fieldErrors).length) {
      setErrors(result.fieldErrors);
      focusField(Object.keys(result.fieldErrors)[0]);
      return;
    }

    // "Save & add another": date, category, mode wahi rehte hain, baaki saaf
    if (result?.ok && addAnother) {
      setForm((prev) => ({
        ...prev,
        amount: "",
        paid_to: "",
        reference_no: "",
        note: "",
      }));
      setErrors({});
      amountRef.current?.focus();
    }
  };

  return (
    <Modal title={isEdit ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form
        className="exp-modal-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <div className="modal-body">
          {error && <div className="exp-error">{error}</div>}

          <div className="exp-grid-2">
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-amount">
                Amount (₹) *
              </label>
              <input
                {...field("amount", "exp-amount")}
                ref={amountRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => update("amount", sanitizeAmount(e.target.value))}
                onBlur={onBlurCheck("amount")}
                required
              />
              <FieldError id="exp-amount-err" message={errors.amount} />
            </div>

            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-date">
                Date *
              </label>
              <input
                {...field("expense_date", "exp-date")}
                type="date"
                value={form.expense_date}
                min={MIN_DATE}
                max={todayStr()}
                onChange={(e) => update("expense_date", e.target.value)}
                onBlur={onBlurCheck("expense_date")}
                required
              />
              <FieldError id="exp-date-err" message={errors.expense_date} />
            </div>
          </div>

          <div className="exp-field">
            <label className="exp-label" htmlFor="exp-category">
              Category *
            </label>
            <select
              {...field("category_id", "exp-category")}
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError id="exp-category-err" message={errors.category_id} />
          </div>

          <div className="exp-field">
            <div className="exp-label" id="exp-paidby">
              Paid By *
            </div>
            <div
              className={`exp-pay ${errors.payment_mode ? "invalid" : ""}`}
              role="radiogroup"
              aria-labelledby="exp-paidby"
            >
              {PAYMENT_MODES.map((m, i) => {
                const on = form.payment_mode === m.value;
                return (
                  <button
                    key={m.value}
                    id={i === 0 ? "exp-pay-first" : undefined}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`exp-pay-opt ${on ? "on" : ""}`}
                    onClick={() => update("payment_mode", m.value)}
                  >
                    <span className="exp-pay-dot" />
                    <span>
                      <span className="exp-pay-title">{m.label}</span>
                      <span className="exp-pay-sub">{m.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <FieldError id="exp-pay-err" message={errors.payment_mode} />
          </div>

          <div className="exp-grid-2">
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-paid-to">
                Paid To
              </label>
              <input
                {...field("paid_to", "exp-paid-to")}
                type="text"
                placeholder="Person or shop"
                maxLength={PAID_TO_MAX}
                value={form.paid_to}
                onChange={(e) => update("paid_to", e.target.value)}
                onBlur={onBlurCheck("paid_to")}
              />
              <FieldError id="exp-paid-to-err" message={errors.paid_to} />
            </div>

            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-ref">
                Bill / Reference No.
              </label>
              <input
                {...field("reference_no", "exp-ref")}
                type="text"
                placeholder="Optional"
                maxLength={REF_MAX}
                value={form.reference_no}
                onChange={(e) => update("reference_no", e.target.value)}
                onBlur={onBlurCheck("reference_no")}
              />
              <FieldError id="exp-ref-err" message={errors.reference_no} />
            </div>
          </div>

          {showBranch && (
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-branch">
                Branch
              </label>
              <select
                {...field("branch_id", "exp-branch")}
                value={form.branch_id}
                onChange={(e) => update("branch_id", e.target.value)}
              >
                <option value="">Default Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <FieldError id="exp-branch-err" message={errors.branch_id} />
            </div>
          )}

          <div className="exp-field">
            <label className="exp-label" htmlFor="exp-note">
              Note
            </label>
            <textarea
              {...field("note", "exp-note")}
              rows={2}
              placeholder="What was this for?"
              maxLength={NOTE_MAX}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              onBlur={onBlurCheck("note")}
            />
            <div className="exp-counter">
              {form.note.length}/{NOTE_MAX}
            </div>
            <FieldError id="exp-note-err" message={errors.note} />
          </div>
        </div>

        <div className="exp-modal-foot">
          <button type="button" className="exp-btn" onClick={onClose}>
            Cancel
          </button>
          {!isEdit && (
            <button
              type="button"
              className="exp-btn outline"
              disabled={saving}
              onClick={() => submit(true)}
            >
              Save &amp; Add Another
            </button>
          )}
          <button type="submit" className="exp-btn primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Category manager                                                   */
/* ------------------------------------------------------------------ */

function CategoryManagerModal({ categories, onClose, onChanged }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const [listError, setListError] = useState("");
  const lock = useRef(false); // double click / blur + Enter se double request na jaye

  const run = async (fn, fallback) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setListError("");
    try {
      await fn();
      await onChanged();
      return true;
    } catch (err) {
      setListError(errorText(err, fallback));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (lock.current) return;

    const value = cleanText(name);
    const problem = validateCategoryName(value, categories);
    if (problem) {
      setAddError(problem);
      return;
    }

    setAddError("");
    const ok = await run(
      () => axios.post("/api/expense-categories", { name: value }),
      "Could not add the category.",
    );
    if (ok) {
      setName("");
      toast.success("Category Created!");
    }
  };

  const rename = async (cat) => {
    if (lock.current) return;

    const value = cleanText(editName);
    if (!value || value === cat.name) {
      setEditingId(null);
      setListError("");
      return;
    }

    const problem = validateCategoryName(value, categories, cat.id);
    if (problem) {
      setListError(problem);
      return;
    }

    const ok = await run(
      () =>
        axios.put(`/api/expense-categories/${cat.id}`, {
          name: value,
          is_active: cat.is_active ?? true,
        }),
      "Could not rename the category.",
    );
    if (ok) setEditingId(null);
  };

  const toggle = (cat) =>
    run(
      () =>
        axios.put(`/api/expense-categories/${cat.id}`, {
          name: cat.name,
          is_active: !(cat.is_active ?? true),
        }),
      "Could not update the category.",
    );

  const remove = (cat) => {
    if (lock.current) return;
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    run(
      () => axios.delete(`/api/expense-categories/${cat.id}`),
      "This category has expenses. Disable it instead of deleting.",
    );
  };

  return (
    <Modal title="Expense Categories" onClose={onClose} width={480}>
      <div className="modal-body exp-modal-form">
        <form className="exp-inline-form" onSubmit={add} noValidate>
          <input
            type="text"
            className={`form-control model-form-control ${addError ? "is-invalid" : ""}`}
            placeholder="New category, e.g. Tea Coffee"
            maxLength={CATEGORY_MAX}
            value={name}
            onChange={(e) => {
              setName(sanitizeCategoryInput(e.target.value));
              if (addError) setAddError("");
            }}
            aria-label="New category name"
            aria-invalid={addError ? "true" : undefined}
          />
          <button
            type="submit"
            className="exp-btn primary"
            disabled={busy || !name.trim()}
          >
            Add
          </button>
        </form>

        {addError && (
          <div className="error-text mb-15" role="alert">
            {addError}
          </div>
        )}
        {listError && (
          <div className="error-text mb-15" role="alert">
            {listError}
          </div>
        )}

        <ul className="exp-cat-list">
          {categories.length === 0 && (
            <li className="exp-sub">
              No categories yet. Add Electricity, Rent, Salary, Tea Coffee
              to begin.
            </li>
          )}

          {categories.map((cat) => {
            const active = cat.is_active ?? true;
            return (
              <li key={cat.id} className={active ? "" : "off"}>
                {editingId === cat.id ? (
                  <input
                    autoFocus
                    type="text"
                    className="form-control model-form-control"
                    maxLength={CATEGORY_MAX}
                    value={editName}
                    onChange={(e) => {
                      setEditName(sanitizeCategoryInput(e.target.value));
                      if (listError) setListError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        rename(cat);
                      }
                      if (e.key === "Escape") {
                        e.stopPropagation(); // modal band na ho, sirf edit cancel ho
                        setEditingId(null);
                        setListError("");
                      }
                    }}
                    onBlur={() => rename(cat)}
                    aria-label={`Rename ${cat.name}`}
                  />
                ) : (
                  <span className="exp-cat-name">
                    {cat.name}
                    {!active && <em>Disabled</em>}
                  </span>
                )}

                <span className="exp-row-actions">
                  <button
                    type="button"
                    className="exp-link"
                    disabled={busy}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditName(cat.name);
                      setListError("");
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="exp-link"
                    disabled={busy}
                    onClick={() => toggle(cat)}
                  >
                    {active ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="exp-link danger"
                    disabled={busy}
                    onClick={() => remove(cat)}
                  >
                    Delete
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="exp-modal-foot">
        <button type="button" className="exp-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const Expenses = () => {
  const appData = useAppData();

  const expenseCategories = appData?.expenseCategories || [];
  const branches = appData?.branches || [];

  // localStorage kharab ho to page crash na ho
  const role = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("user_detail") || "null");
      return data?.user?.role;
    } catch {
      return undefined;
    }
  }, []);
  const showBranch = role === "admin" && hasFeature("branch_management");

  // filters
  const [rangeKey, setRangeKey] = useState("this_month");
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [mode, setMode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [resetPaging, setResetPaging] = useState(false);

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // modals
  const [formState, setFormState] = useState(null); // { expense: row | null }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const requestId = useRef(0);
  const savingLock = useRef(false);

  const range = useMemo(
    () => getRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo],
  );

  // Custom date range ki validation
  const rangeError = useMemo(() => {
    if (rangeKey !== "custom") return "";
    if (!customFrom || !customTo) return "Select both the start and end date.";
    if (!isValidDate(customFrom) || !isValidDate(customTo)) {
      return "Enter valid dates.";
    }
    if (customFrom > customTo) return "The start date is after the end date.";
    if (customTo > todayStr()) return "The end date cannot be in the future.";
    if (customFrom < MIN_DATE) {
      return `The start date cannot be before ${prettyDate(MIN_DATE)}.`;
    }
    if (daysBetween(customFrom, customTo) > MAX_RANGE_DAYS) {
      return `Please select a range of up to ${MAX_RANGE_DAYS} days.`;
    }
    return "";
  }, [rangeKey, customFrom, customTo]);

  /* ---------- categories / branches (context cache) ---------- */
  useEffect(() => {
    appData?.loadExpenseCategories();
    if (showBranch) appData?.loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- expenses (date, payment mode, branch -> server) ---------- */
  const fetchExpenses = useCallback(async () => {
    if (rangeError || !range.from || !range.to || range.from > range.to) {
      requestId.current += 1; // koi purana response ab apply na ho
      setRows([]);
      setLoading(false);
      setLoadError(rangeError || "The start date is after the end date.");
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setLoadError("");

    try {
      const params = { from_date: range.from, to_date: range.to };
      if (branchId) params.branch_id = branchId;

      const res = await axios.get("/api/expenses", { params });
      if (id !== requestId.current) return; // purana response ignore
      setRows(toArray(res.data));
    } catch (err) {
      if (id !== requestId.current) return;
      setRows([]);
      setLoadError(errorText(err, "Could not load expenses. Try again."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [range.from, range.to, branchId, rangeError]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // filter badalne par table wapas page 1 par
  useEffect(() => {
    setResetPaging((p) => !p);
  }, [rangeKey, customFrom, customTo, mode, branchId, categoryId, search]);

  /* ---------- derived data ---------- */
  const categoryName = useCallback(
    (row) =>
      row.category?.name ||
      row.category_name ||
      expenseCategories.find((c) => String(c.id) === String(row.category_id))
        ?.name ||
      "Uncategorised",
    [expenseCategories],
  );

  // Category + search client-side, taaki breakdown poori range ka dikhta rahe
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryId && String(r.category_id) !== String(categoryId)) {
        return false;
      }
      if (mode === "cash" && r.payment_mode !== "cash") return false;
      if (mode === "online" && r.payment_mode === "cash") return false;
      if (!q) return true;
      return [categoryName(r), r.paid_to, r.note, r.reference_no]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, categoryId, mode, search, categoryName]);

  const totals = useMemo(() => {
    let total = 0;
    let cash = 0;
    visibleRows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      total += amt;
      if (r.payment_mode === "cash") cash += amt;
    });
    return { total, cash, bank: total - cash, count: visibleRows.length };
  }, [visibleRows]);

  const breakdown = useMemo(() => {
    const map = new Map();
    let grand = 0;
    rows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      grand += amt;
      const key = String(r.category_id ?? "none");
      const prev = map.get(key) || {
        id: r.category_id,
        name: categoryName(r),
        amount: 0,
      };
      prev.amount += amt;
      map.set(key, prev);
    });
    return [...map.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        ...item,
        share: grand ? (item.amount / grand) * 100 : 0,
      }));
  }, [rows, categoryName]);

  const filtersActive =
    mode || categoryId || branchId || search.trim() || rangeKey !== "this_month";

  const clearFilters = () => {
    setRangeKey("this_month");
    setCustomFrom(todayStr());
    setCustomTo(todayStr());
    setMode("");
    setCategoryId("");
    setBranchId("");
    setSearch("");
  };

  /* ---------- add / edit ---------- */
  const openAdd = () => {
    setFormError("");
    setFormState({ expense: null });
  };

  const openEdit = (expense) => {
    setFormError("");
    setFormState({ expense });
  };

  const formInitial = useMemo(() => {
    const e = formState?.expense;
    if (!e) {
      // Filter wali category tabhi pre-select ho jab wo active ho
      const preset = expenseCategories.find(
        (c) =>
          String(c.id) === String(categoryId) && (c.is_active ?? true),
      );
      return { ...emptyForm(), category_id: preset ? String(preset.id) : "" };
    }
    return {
      expense_date: String(e.expense_date || todayStr()).slice(0, 10),
      category_id: String(e.category_id ?? ""),
      amount: String(e.amount ?? ""),
      payment_mode: e.payment_mode === "cash" || !e.payment_mode ? "cash" : "upi",
      paid_to: e.paid_to || "",
      reference_no: e.reference_no || "",
      note: e.note || "",
      branch_id: e.branch_id ? String(e.branch_id) : "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  // Dropdown me sirf active categories; edit me current category (disabled bhi) dikhegi
  const formCategories = useMemo(() => {
    const current = formState?.expense?.category_id;
    return expenseCategories.filter(
      (c) => (c.is_active ?? true) || String(c.id) === String(current),
    );
  }, [expenseCategories, formState]);

  // Cash in hand / bank balance badalte hain, dashboard cache stale mark karo
  const afterMoneyChange = () => {
    appData?.invalidate("dashboard");
    invalidateDashboardCache();
  };

  // Returns { ok, fieldErrors? } taaki modal field-wise error dikha sake
  const saveExpense = async (form, addAnother) => {
    if (savingLock.current) return { ok: false };

    // Dobara validation (defensive): modal ke bahar se call ho to bhi safe
    const found = validateExpense(form, {
      categories: formCategories,
      branches,
      showBranch,
    });
    if (Object.keys(found).length) {
      return { ok: false, fieldErrors: found };
    }

    const payload = {
      ...form,
      category_id: Number(form.category_id),
      amount: Number(Number(form.amount).toFixed(2)),
    };
    if (!showBranch || !payload.branch_id) delete payload.branch_id;
    if (!payload.paid_to) payload.paid_to = null;
    if (!payload.reference_no) payload.reference_no = null;
    if (!payload.note) payload.note = null;

    const editing = formState?.expense;
    savingLock.current = true;
    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await axios.put(`/api/expenses/${editing.id}`, payload);
      } else {
        await axios.post("/api/expenses", payload);
      }

      afterMoneyChange();
      await fetchExpenses();
      toast.success(editing ? "Expense Updated!" : "Expense Saved!");
      if (!addAnother) setFormState(null);
      return { ok: true };
    } catch (err) {
      const fieldErrors = serverFieldErrors(err);
      if (Object.keys(fieldErrors).length) {
        setFormError("");
        return { ok: false, fieldErrors };
      }
      setFormError(errorText(err, "Failed to save expense"));
      return { ok: false };
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await axios.delete(`/api/expenses/${deleting.id}`);
      afterMoneyChange();
      setDeleting(null);
      await fetchExpenses();
      toast.success("Expense Deleted!");
    } catch (err) {
      setDeleting(null);
      toast.error(errorText(err, "Failed to delete expense"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const refreshCategories = async () => {
    appData?.invalidate("expenseCategories");
    await appData?.loadExpenseCategories();
  };

  /* ---------- table columns ---------- */
  const columns = [
    {
      name: "Date",
      selector: (r) => r.expense_date,
      sortable: true,
      width: "130px",
      cell: (r) => prettyDate(r.expense_date),
    },
    {
      name: "Category",
      selector: (r) => categoryName(r),
      sortable: true,
      width: "180px",
      cell: (r) => <strong>{categoryName(r)}</strong>,
    },
    {
      name: "Details",
      grow: 2,
      minWidth: "220px",
      cell: (r) => (
        <div style={{ padding: "8px 0" }}>
          {r.paid_to && <div>{r.paid_to}</div>}
          {r.note && <div className="exp-sub">{r.note}</div>}
          {r.reference_no && <div className="exp-sub">Ref {r.reference_no}</div>}
          {!r.paid_to && !r.note && !r.reference_no && (
            <span className="exp-sub">-</span>
          )}
        </div>
      ),
    },
    {
      name: "Paid By",
      selector: (r) => r.payment_mode,
      sortable: true,
      width: "150px",
      cell: (r) => <ModeBadge mode={r.payment_mode} />,
    },
    {
      name: "Amount",
      selector: (r) => Number(r.amount) || 0,
      sortable: true,
      right: true,
      width: "150px",
      cell: (r) => <strong>{inr(r.amount)}</strong>,
    },
    {
      name: "Action",
      width: "120px",
      cell: (r) => (
        <div className="list-icon-function">
          <div className="item edit" onClick={() => openEdit(r)}>
            <i className="icon-edit-3"></i>
          </div>
          <div className="item trash" onClick={() => setDeleting(r)}>
            <i className="icon-trash-2"></i>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <style>{`
        .exp-sub { font-size: 12.5px; color: #6b7280; }
        .exp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
        .exp-modal-card { width: 100%; max-height: 92vh; overflow-y: auto; }
        .exp-modal-form select, .exp-modal-form input, .exp-modal-form textarea { width: 100%; }
        .exp-modal-form textarea { height: auto; resize: vertical; }

        .exp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .exp-toolbar .wg-filter { flex: 1; min-width: 260px; max-width: 420px; }
        .exp-toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .exp-filters { margin-bottom: 4px; }

        .exp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 24px; }
        .exp-stat { padding: 16px 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
        .exp-stat span { font-size: 13px; font-weight: 500; color: #6b7280; }
        .exp-stat strong { display: block; margin-top: 2px; font-size: 22px; line-height: 30px; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
        .exp-stat.main { background: #2f63f6; border-color: #2f63f6; }
        .exp-stat.main span { color: #dbeafe; }
        .exp-stat.main strong { color: #fff; }

        .exp-breakdown-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .exp-bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
        .exp-bar-btn { width: 100%; display: grid; grid-template-columns: minmax(110px, 190px) 1fr auto; gap: 14px; align-items: center; padding: 8px 10px; border: 0; border-radius: 10px; background: transparent; font: inherit; text-align: left; color: inherit; cursor: pointer; }
        .exp-bar-btn:hover { background: rgba(47, 99, 246, .07); }
        .exp-bar-btn.on { background: rgba(47, 99, 246, .13); }
        .exp-bar-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .exp-bar-track { height: 8px; border-radius: 6px; background: #e5e7eb; overflow: hidden; }
        .exp-bar-fill { display: block; height: 100%; border-radius: 6px; background: #2f63f6; }
        .exp-bar-val { font-weight: 600; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .exp-bar-val small { margin-left: 6px; font-weight: 500; color: #6b7280; }

        .exp-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 600; white-space: nowrap; }
        .exp-badge.cash { background: rgba(34, 197, 94, .15); color: #16a34a; }
        .exp-badge.bank { background: rgba(47, 99, 246, .12); color: #2f63f6; }

        .exp-row-actions { display: inline-flex; gap: 12px; white-space: nowrap; }
        .exp-link { border: 0; background: transparent; padding: 0; font: inherit; font-weight: 600; color: #2f63f6; cursor: pointer; }
        .exp-link:hover:not(:disabled) { text-decoration: underline; }
        .exp-link:disabled { opacity: .5; cursor: not-allowed; }
        .exp-link.danger { color: #dc2626; }
        .exp-link:focus-visible, .exp-bar-btn:focus-visible { outline: 2px solid #2f63f6; outline-offset: 2px; }

        .exp-empty { padding: 44px 20px; text-align: center; color: #6b7280; }
        .exp-empty strong { display: block; margin-bottom: 4px; font-size: 16px; color: #111827; }

        .exp-modal-form .modal-body { padding: 20px 24px 8px; }
        .exp-field { margin-bottom: 16px; }
        .exp-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #111827; }
        .exp-modal-form .exp-input { width: 100%; height: 44px; padding: 0 14px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #111827; font: inherit; box-shadow: none; }
        .exp-modal-form textarea.exp-input { height: auto; min-height: 76px; padding: 10px 14px; resize: vertical; }
        .exp-modal-form .exp-input::placeholder { color: #9ca3af; }
        .exp-modal-form .exp-input:focus { outline: 0; border-color: #2f63f6; box-shadow: 0 0 0 3px rgba(47, 99, 246, .15); }
        .exp-modal-form .exp-input.invalid { border-color: #dc2626; background: #fffafa; }
        .exp-modal-form .exp-input.invalid:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, .15); }
        .exp-error { margin-bottom: 14px; padding: 10px 14px; border-radius: 10px; background: #fef2f2; color: #b91c1c; font-size: 13.5px; }
        .exp-field-error { margin-top: 5px; font-size: 12.5px; font-weight: 500; color: #dc2626; }
        .exp-counter { margin-top: 3px; text-align: right; font-size: 11.5px; color: #9ca3af; }

        .exp-pay { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .exp-pay.invalid .exp-pay-opt { border-color: #dc2626; }
        .exp-pay-opt { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #111827; font: inherit; text-align: left; cursor: pointer; }
        .exp-pay-opt:hover { border-color: #93a8f4; }
        .exp-pay-opt.on { border-color: #2f63f6; background: rgba(47, 99, 246, .07); }
        .exp-pay-dot { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1; background: #fff; }
        .exp-pay-opt.on .exp-pay-dot { border: 5px solid #2f63f6; }
        .exp-pay-title { display: block; font-weight: 600; }
        .exp-pay-sub { display: block; font-size: 12.5px; color: #6b7280; }
        .exp-pay-opt:focus-visible { outline: 2px solid #2f63f6; outline-offset: 2px; }

        .exp-modal-foot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; padding: 16px 24px; border-top: 1px solid #e5e7eb; }
        .exp-btn { height: 42px; padding: 0 20px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #374151; font: inherit; font-weight: 600; white-space: nowrap; cursor: pointer; }
        .exp-btn:hover:not(:disabled) { background: #f3f4f6; }
        .exp-btn.outline { border-color: #2f63f6; color: #2f63f6; }
        .exp-btn.outline:hover:not(:disabled) { background: rgba(47, 99, 246, .07); }
        .exp-btn.primary { border-color: #2f63f6; background: #2f63f6; color: #fff; }
        .exp-btn.primary:hover:not(:disabled) { background: #1f49dd; }
        .exp-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
        .exp-btn.danger:hover:not(:disabled) { background: #b91c1c; }
        .exp-btn:disabled { opacity: .55; cursor: not-allowed; }
        .exp-btn:focus-visible { outline: 2px solid #2f63f6; outline-offset: 2px; }

        .exp-inline-form { display: flex; gap: 10px; margin-bottom: 14px; }
        .exp-inline-form input { flex: 1; }
        .exp-cat-list { list-style: none; margin: 0; padding: 0; max-height: 340px; overflow-y: auto; border: 1px solid rgba(148, 163, 184, .35); border-radius: 12px; }
        .exp-cat-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid rgba(148, 163, 184, .25); }
        .exp-cat-list li:last-child { border-bottom: 0; }
        .exp-cat-list li.off .exp-cat-name { opacity: .6; }
        .exp-cat-list input { height: 34px; }
        .exp-cat-name { font-weight: 600; }
        .exp-cat-name em { margin-left: 8px; font-style: normal; font-weight: 500; font-size: 12px; opacity: .7; }

        @media (max-width: 768px) {
          .exp-grid-2 { grid-template-columns: 1fr; }
          .exp-bar-btn { grid-template-columns: 1fr auto; }
          .exp-bar-track { grid-column: 1 / -1; order: 3; }
          .exp-pay { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Header (same as Branch / Staff pages) */}
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "5px",
                  height: "34px",
                  borderRadius: "999px",
                  background: "linear-gradient(180deg, #2f63f6, #1f49dd)",
                  display: "inline-block",
                }}
              />
              <div>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#111827",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Expenses
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    margin: "2px 0 0 0",
                  }}
                >
                  Track where your shop money goes.
                </p>
              </div>
            </div>

            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">
                  <div className="text-tiny">Expenses</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Expenses</div>
              </li>
            </ul>
          </div>

          {/* Totals */}
          <div className="exp-stats">
            <div className="exp-stat main">
              <span>Total Spent</span>
              <strong>{inr(totals.total)}</strong>
            </div>
            <div className="exp-stat">
              <span>Paid From Cash</span>
              <strong>{inr(totals.cash)}</strong>
            </div>
            <div className="exp-stat">
              <span>Paid From Bank</span>
              <strong>{inr(totals.bank)}</strong>
            </div>
            <div className="exp-stat">
              <span>Entries</span>
              <strong>{totals.count}</strong>
            </div>
          </div>

          {/* Category-wise breakdown */}
          {breakdown.length > 0 && (
            <div className="wg-box mb-50">
              <div className="exp-breakdown-head">
                <h5>Spending by Category</h5>
                <span className="exp-sub">
                  Click a category to filter the list
                </span>
              </div>
              <ul className="exp-bars">
                {breakdown.map((item) => {
                  const on = String(item.id) === String(categoryId);
                  return (
                    <li key={item.id ?? "none"}>
                      <button
                        type="button"
                        className={`exp-bar-btn ${on ? "on" : ""}`}
                        aria-pressed={on}
                        onClick={() =>
                          setCategoryId(on ? "" : String(item.id ?? ""))
                        }
                      >
                        <span className="exp-bar-name">{item.name}</span>
                        <span className="exp-bar-track">
                          <span
                            className="exp-bar-fill"
                            style={{ width: `${Math.max(item.share, 2)}%` }}
                          />
                        </span>
                        <span className="exp-bar-val">
                          {inr(item.amount)}
                          <small>{item.share.toFixed(0)}%</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* List */}
          <div className="wg-box wg-content mb-50">
            <div className="exp-toolbar">
              <div className="wg-filter">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search paid to, note, bill no..."
                      maxLength={SEARCH_MAX}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>

              <div className="exp-toolbar-actions">
                <button
                  type="button"
                  className="tf-button style-1"
                  onClick={() => setShowCategories(true)}
                >
                  Manage Categories
                </button>
                <button
                  type="button"
                  className="tf-button style-1 w208"
                  onClick={openAdd}
                >
                  <i className="icon-plus"></i>Add new
                </button>
              </div>
            </div>

            <div className="row exp-filters">
              <fieldset className="col-md-3 mb-15">
                <div className="body-title">Period</div>
                <div className="body-content">
                  <select
                    value={rangeKey}
                    onChange={(e) => setRangeKey(e.target.value)}
                  >
                    {RANGES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              {rangeKey === "custom" && (
                <>
                  <fieldset className="col-md-3 mb-15">
                    <div className="body-title">From</div>
                    <div className="body-content">
                      <input
                        type="date"
                        value={customFrom}
                        min={MIN_DATE}
                        max={customTo || todayStr()}
                        aria-invalid={rangeError ? "true" : undefined}
                        onChange={(e) => setCustomFrom(e.target.value)}
                      />
                    </div>
                  </fieldset>
                  <fieldset className="col-md-3 mb-15">
                    <div className="body-title">To</div>
                    <div className="body-content">
                      <input
                        type="date"
                        value={customTo}
                        min={customFrom || MIN_DATE}
                        max={todayStr()}
                        aria-invalid={rangeError ? "true" : undefined}
                        onChange={(e) => setCustomTo(e.target.value)}
                      />
                    </div>
                  </fieldset>
                </>
              )}

              <fieldset className="col-md-3 mb-15">
                <div className="body-title">Category</div>
                <div className="body-content">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              <fieldset className="col-md-3 mb-15">
                <div className="body-title">Paid By</div>
                <div className="body-content">
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="">All Payment Modes</option>
                    <option value="cash">Cash</option>
                    <option value="online">UPI / Bank transfer</option>
                  </select>
                </div>
              </fieldset>

              {showBranch && (
                <fieldset className="col-md-3 mb-15">
                  <div className="body-title">Branch</div>
                  <div className="body-content">
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>
              )}
            </div>

            {filtersActive && (
              <button
                type="button"
                className="exp-link mb-15"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}

            {loadError && (
              <div className="error-text mb-15" role="alert">
                {loadError}
              </div>
            )}

            <DataTable
              columns={columns}
              data={visibleRows}
              pagination
              paginationPerPage={25}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              paginationResetDefaultPage={resetPaging}
              progressPending={loading}
              progressComponent={
                <div className="text-center p-20">Loading expenses...</div>
              }
              highlightOnHover
              responsive
              noDataComponent={
                <div className="exp-empty">
                  <strong>
                    {rows.length === 0
                      ? "No expenses in this period"
                      : "No expenses match these filters"}
                  </strong>
                  {rows.length === 0
                    ? "Click Add new to start tracking where the money goes."
                    : "Try a different category, payment mode or search."}
                </div>
              }
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "14px",
                  },
                },
              }}
            />
            <div className="divider"></div>
          </div>

          {/* Modals */}
          {formState && (
            <ExpenseFormModal
              key={formState.expense?.id ?? "new"}
              initial={formInitial}
              isEdit={Boolean(formState.expense)}
              categories={formCategories}
              branches={branches}
              showBranch={showBranch}
              saving={saving}
              error={formError}
              onSubmit={saveExpense}
              onClose={() => setFormState(null)}
            />
          )}

          {showCategories && (
            <CategoryManagerModal
              categories={expenseCategories}
              onClose={() => setShowCategories(false)}
              onChanged={refreshCategories}
            />
          )}

          {deleting && (
            <Modal
              title="Delete this expense?"
              onClose={() => setDeleting(null)}
              width={440}
            >
              <div className="modal-body">
                <p>
                  {inr(deleting.amount)} for{" "}
                  <strong>{categoryName(deleting)}</strong> on{" "}
                  {prettyDate(deleting.expense_date)} will be removed.
                </p>
              </div>
              <div className="exp-modal-foot">
                <button
                  type="button"
                  className="exp-btn"
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="exp-btn danger"
                  disabled={deleteBusy}
                  onClick={confirmDelete}
                >
                  {deleteBusy ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Expenses;