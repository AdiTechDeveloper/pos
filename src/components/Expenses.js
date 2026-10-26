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
  const amountRef = useRef(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (addAnother) => {
    const ok = await onSubmit(form, addAnother);
    // "Save & add another": date, category, mode wahi rehte hain, baaki saaf
    if (ok && addAnother) {
      setForm((prev) => ({
        ...prev,
        amount: "",
        paid_to: "",
        reference_no: "",
        note: "",
      }));
      amountRef.current?.focus();
    }
  };

  return (
    <Modal title={isEdit ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form
        className="exp-modal-form"
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
                id="exp-amount"
                ref={amountRef}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="exp-input"
                placeholder="0.00"
                value={form.amount}
                onChange={set("amount")}
                required
              />
            </div>

            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-date">
                Date *
              </label>
              <input
                id="exp-date"
                type="date"
                className="exp-input"
                value={form.expense_date}
                max={todayStr()}
                onChange={set("expense_date")}
                required
              />
            </div>
          </div>

          <div className="exp-field">
            <label className="exp-label" htmlFor="exp-category">
              Category *
            </label>
            <select
              id="exp-category"
              className="exp-input"
              value={form.category_id}
              onChange={set("category_id")}
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="exp-field">
            <div className="exp-label" id="exp-paidby">
              Paid By *
            </div>
            <div className="exp-pay" role="radiogroup" aria-labelledby="exp-paidby">
              {PAYMENT_MODES.map((m) => {
                const on = form.payment_mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`exp-pay-opt ${on ? "on" : ""}`}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, payment_mode: m.value }))
                    }
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
          </div>

          <div className="exp-grid-2">
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-paid-to">
                Paid To
              </label>
              <input
                id="exp-paid-to"
                type="text"
                className="exp-input"
                placeholder="Person or shop"
                maxLength={120}
                value={form.paid_to}
                onChange={set("paid_to")}
              />
            </div>

            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-ref">
                Bill / Reference No.
              </label>
              <input
                id="exp-ref"
                type="text"
                className="exp-input"
                placeholder="Optional"
                maxLength={60}
                value={form.reference_no}
                onChange={set("reference_no")}
              />
            </div>
          </div>

          {showBranch && (
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-branch">
                Branch
              </label>
              <select
                id="exp-branch"
                className="exp-input"
                value={form.branch_id}
                onChange={set("branch_id")}
              >
                <option value="">Default Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="exp-field">
            <label className="exp-label" htmlFor="exp-note">
              Note
            </label>
            <textarea
              id="exp-note"
              rows={2}
              className="exp-input"
              placeholder="What was this for?"
              maxLength={300}
              value={form.note}
              onChange={set("note")}
            />
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
  const [error, setError] = useState("");

  const run = async (fn, fallback) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await onChanged();
      return true;
    } catch (err) {
      setError(errorText(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const value = name.trim();
    if (value.length < 3) {
      setError("Category name must be at least 3 characters.");
      return;
    }
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
    const value = editName.trim();
    if (!value || value === cat.name) {
      setEditingId(null);
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
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    run(
      () => axios.delete(`/api/expense-categories/${cat.id}`),
      "This category has expenses. Disable it instead of deleting.",
    );
  };

  return (
    <Modal title="Expense Categories" onClose={onClose} width={480}>
      <div className="modal-body exp-modal-form">
        <form className="exp-inline-form" onSubmit={add}>
          <input
            type="text"
            className={`form-control model-form-control ${error ? "is-invalid" : ""}`}
            placeholder="New category, e.g. Tea & Coffee"
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            aria-label="New category name"
          />
          <button
            type="submit"
            className="exp-btn primary"
            disabled={busy || !name.trim()}
          >
            Add
          </button>
        </form>

        {error && <div className="error-text mb-15">{error}</div>}

        <ul className="exp-cat-list">
          {categories.length === 0 && (
            <li className="exp-sub">
              No categories yet. Add Electricity, Rent, Salary, Tea &amp; Coffee
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
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") rename(cat);
                      if (e.key === "Escape") setEditingId(null);
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
        <button
          type="button"
          className="exp-btn"
          onClick={onClose}
        >
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

  const user_data = JSON.parse(localStorage.getItem("user_detail") || "null");
  const role = user_data?.user?.role;
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

  const range = useMemo(
    () => getRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo],
  );

  /* ---------- categories / branches (context cache) ---------- */
  useEffect(() => {
    appData?.loadExpenseCategories();
    if (showBranch) appData?.loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- expenses (date, payment mode, branch -> server) ---------- */
  const fetchExpenses = useCallback(async () => {
    if (!range.from || !range.to || range.from > range.to) {
      setRows([]);
      setLoading(false);
      setLoadError("The start date is after the end date.");
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
  }, [range.from, range.to, branchId]);

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
    if (!e) return { ...emptyForm(), category_id: categoryId || "" };
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

  const saveExpense = async (form, addAnother) => {
    const amount = Number(form.amount);

    if (!form.category_id) {
      setFormError("Please select a category.");
      return false;
    }
    if (!amount || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return false;
    }
    if (!form.expense_date) {
      setFormError("Please choose the expense date.");
      return false;
    }

    const payload = {
      ...form,
      category_id: Number(form.category_id),
      amount,
    };
    if (!payload.branch_id) delete payload.branch_id;

    const editing = formState?.expense;
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
      return true;
    } catch (err) {
      setFormError(errorText(err, "Failed to save expense"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    if (!deleting) return;
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
        .exp-error { margin-bottom: 14px; padding: 10px 14px; border-radius: 10px; background: #fef2f2; color: #b91c1c; font-size: 13.5px; }

        .exp-pay { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
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
                        max={customTo || undefined}
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
                        min={customFrom || undefined}
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

            {loadError && <div className="error-text mb-15">{loadError}</div>}

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