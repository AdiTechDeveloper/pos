import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import {
  Search,
  Receipt,
  RotateCcw,
  Package,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  ScanBarcode,
} from "lucide-react";
import Layout from "./layout";

const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online" },
  { value: "store_credit", label: "Store Credit" },
  { value: "credit_note", label: "Credit Note" },
];

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

const pickPositive = (...values) => {
  for (const value of values) {
    if (value == null || value === "") continue;
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  return null;
};

const getLineTotalAmount = (line) => {
  const direct = pickPositive(
    line.line_total,
    line.total_amount,
    line.total,
    line.amount,
    line.line_amount,
    line.net_amount,
    line.gross_amount,
    line.final_amount,
    line.subtotal,
    line.line_subtotal,
  );
  if (direct != null) return direct;

  const taxable = Number(line.taxable_amount ?? line.taxable_value ?? 0);
  const gst =
    Number(line.total_gst ?? line.gst_amount ?? 0) ||
    Number(line.cgst_amount ?? 0) +
      Number(line.sgst_amount ?? 0) +
      Number(line.igst_amount ?? 0);
  if (taxable > 0) return taxable + gst;

  const qty = Number(line.qty) || 1;
  const unit = pickPositive(
    line.unit_price,
    line.selling_price,
    line.final_selling_price,
    line.rate,
    line.price,
    line.net_rate,
    line.effective_price,
    line.mrp,
    line.inventory?.selling_price,
    line.product?.selling_price,
    line.product?.price,
  );
  if (unit != null) return unit * qty;

  return 0;
};

const getLineUnitPrice = (line, bill) => {
  const soldQty = Number(line.qty) || 0;
  const lineTotal = getLineTotalAmount(line);
  if (lineTotal > 0 && soldQty > 0) return lineTotal / soldQty;

  const direct = pickPositive(
    line.unit_price,
    line.selling_price,
    line.final_selling_price,
    line.rate,
    line.price,
    line.inventory?.selling_price,
    line.product?.selling_price,
  );
  if (direct != null) return direct;

  const billTotal = Number(bill?.total_amount ?? bill?.grand_total ?? 0);
  if (billTotal > 0 && bill?.lines?.length && soldQty > 0) {
    const totalSoldQty = bill.lines.reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0,
    );
    if (totalSoldQty > 0) return billTotal / totalSoldQty;
  }

  return 0;
};

const getLineRefundAmount = (line, bill, returnQty) => {
  const rQty = Number(returnQty) || 0;
  if (rQty <= 0) return 0;

  const soldQty = Number(line.qty) || 0;
  const unitPrice = getLineUnitPrice(line, bill);
  if (unitPrice > 0) return unitPrice * rQty;

  const lineTotal = getLineTotalAmount(line);
  if (lineTotal > 0 && soldQty > 0) return (lineTotal / soldQty) * rQty;

  return 0;
};

export default function ProcessSalesReturn() {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const [billNoInput, setBillNoInput] = useState("");
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refundType, setRefundType] = useState("cash");
  const [notes, setNotes] = useState("");
  const [selectedLines, setSelectedLines] = useState({});

  const returnSummary = useMemo(() => {
    if (!billData) return { itemCount: 0, refundTotal: 0, selectedCount: 0 };

    let itemCount = 0;
    let refundTotal = 0;
    let selectedCount = 0;

    billData.lines.forEach((line) => {
      const state = selectedLines[line.id];
      const qty = Number(state?.qty) || 0;
      if (state?.checked && qty > 0) {
        selectedCount += 1;
        itemCount += qty;
        refundTotal += getLineRefundAmount(line, billData, qty);
      }
    });

    return { itemCount, refundTotal, selectedCount };
  }, [billData, selectedLines]);

  const selectableLineCount = useMemo(() => {
    if (!billData) return 0;
    return billData.lines.filter((line) => {
      const maxReturnable = line.qty - (line.total_returned_qty || 0);
      return maxReturnable > 0;
    }).length;
  }, [billData]);

  const allSelectableChecked = useMemo(() => {
    if (!billData || selectableLineCount === 0) return false;
    return billData.lines.every((line) => {
      const state = selectedLines[line.id];
      if (!state || state.maxQty <= 0) return true;
      return state.checked;
    });
  }, [billData, selectedLines, selectableLineCount]);

  const handleFetchBill = async (e) => {
    e.preventDefault();
    if (!billNoInput.trim()) return;

    try {
      setLoading(true);
      toast.dismiss();
      setBillData(null);
      setNotes("");

      const token = user_data?.token;
      const res = await axios.get(`${BASE_URL}/api/sales-bills/lookup`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { bill_no: billNoInput.trim() },
      });

      if (res.data?.status === false) {
        throw new Error(res.data.message || "Invoice record not found.");
      }

      const bill = res.data.data;
      if (!bill) throw new Error("Invoice record not found.");

      setBillData(bill);
      setRefundType(bill.customer_id ? "store_credit" : "cash");

      const initialLines = {};
      bill.lines.forEach((line) => {
        const maxReturnable = line.qty - (line.total_returned_qty || 0);
        initialLines[line.id] = {
          checked: false,
          qty: maxReturnable > 0 ? maxReturnable : 0,
          maxQty: maxReturnable,
          is_damaged: false,
        };
      });
      setSelectedLines(initialLines);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to retrieve invoice records.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (lineId, key, value) => {
    setSelectedLines((prev) => {
      const current = prev[lineId] || {};
      let nextValue = value;

      if (key === "qty") {
        const maxQty = Number(current.maxQty) || 0;
        const parsed = Number(value);
        if (Number.isNaN(parsed)) nextValue = "";
        else nextValue = Math.min(Math.max(0, parsed), maxQty);
      }

      return {
        ...prev,
        [lineId]: { ...current, [key]: nextValue },
      };
    });
  };

  const handleSelectAll = (checked) => {
    if (!billData) return;
    setSelectedLines((prev) => {
      const next = { ...prev };
      billData.lines.forEach((line) => {
        if (next[line.id]?.maxQty > 0) {
          next[line.id] = { ...next[line.id], checked };
        }
      });
      return next;
    });
  };

  const handleConfirmReturn = async () => {
    const payloadLines = Object.keys(selectedLines)
      .filter((id) => {
        const line = selectedLines[id];
        return line.checked && Number(line.qty) > 0;
      })
      .map((id) => ({
        sales_bill_line_id: parseInt(id),
        qty: parseFloat(selectedLines[id].qty),
        is_damaged: selectedLines[id].is_damaged,
      }));

    if (payloadLines.length === 0) {
      toast.error("Please select at least one itemized return line.");
      return;
    }

    try {
      setSubmitting(true);
      toast.dismiss();
      const token = user_data?.token;
      const idempotencyKey = uuidv4();

      const response = await axios.post(
        `${BASE_URL}/api/sales-bill/return`,
        {
          sales_bill_id: billData.id,
          refund_type: billData?.customer_id ? refundType : "cash",
          notes,
          lines: payloadLines,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": idempotencyKey,
            Accept: "application/json",
          },
        },
      );

      if (response.data.status) {
        toast.success("Sales return processed successfully.");
        setBillData(null);
        setBillNoInput("");
        setNotes("");
        setSelectedLines({});
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Internal database processing error.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetSearch = () => {
    setBillData(null);
    setBillNoInput("");
    setNotes("");
    setSelectedLines({});
  };

  return (
    <Layout>
      <div className="sr-shell">
        <div className="sr-header">
          <div>
            <h3 className="sr-title">Sales Return</h3>
            <p className="sr-subtitle">
              Scan invoice, select items, issue refund
            </p>
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
              <Link to="/sale-bill">
                <div className="text-tiny">Sale Bills</div>
              </Link>
            </li>
            <li>
              <i className="icon-chevron-right"></i>
            </li>
            <li>
              <div className="text-tiny">Sales Return</div>
            </li>
          </ul>
        </div>

        <div className="sr-search-bar">
          <div className="sr-search-icon">
            <ScanBarcode size={22} />
          </div>
          <form onSubmit={handleFetchBill} className="sr-search-form">
            <input
              type="text"
              placeholder="Scan or enter invoice / bill number..."
              value={billNoInput}
              onChange={(e) => setBillNoInput(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="sr-btn sr-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="sr-spinner" />
                  Loading...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Fetch Bill
                </>
              )}
            </button>
            <button type="button" className="ml-5">
              <a href="/sales-return/list"> Cancel</a>
            </button>
          </form>
          {billData && (
            <button
              type="button"
              className="sr-btn sr-btn-ghost"
              onClick={resetSearch}
            >
              <RotateCcw size={16} />
              New
            </button>
          )}
        </div>

        {!billData ? (
          <div className="sr-empty-state">
            <div className="sr-empty-icon">
              <Receipt size={48} strokeWidth={1.5} />
            </div>
            <h4>Ready to Process a Return</h4>
            <p>
              Enter the invoice number in the search bar above to load bill
              items.
            </p>
          </div>
        ) : (
          <div className="sr-workspace">
            <div className="sr-items-panel">
              <div className="sr-panel-head">
                <div className="sr-panel-title">
                  <span>Return Items</span>
                </div>
                <span className="sr-panel-meta">
                  {billData.lines.length} product
                  {billData.lines.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="sr-table-scroll">
                <table className="sr-table">
                  <thead>
                    <tr>
                      <th className="col-check">
                        <input
                          type="checkbox"
                          className="sr-checkbox"
                          checked={allSelectableChecked}
                          disabled={selectableLineCount === 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          aria-label="Select all returnable items"
                        />
                      </th>
                      <th className="col-product">Product</th>
                      <th className="col-num">Rate</th>
                      <th className="col-num">Sold</th>
                      <th className="col-num">Returned</th>
                      <th className="col-qty">Return Qty</th>
                      <th className="col-num">Refund</th>
                      <th className="col-condition">Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billData.lines.map((line) => {
                      const lineState = selectedLines[line.id] || {};
                      const isDisabled = lineState.maxQty <= 0;
                      const unitPrice = getLineUnitPrice(line, billData);
                      const returnQty = Number(lineState.qty) || 0;
                      const lineRefund =
                        lineState.checked && returnQty > 0
                          ? getLineRefundAmount(line, billData, returnQty)
                          : 0;

                      return (
                        <tr
                          key={line.id}
                          className={[
                            lineState.checked ? "is-selected" : "",
                            isDisabled ? "is-disabled" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td className="col-check">
                            <input
                              type="checkbox"
                              className="sr-checkbox"
                              checked={lineState.checked || false}
                              disabled={isDisabled}
                              onChange={(e) =>
                                handleLineChange(
                                  line.id,
                                  "checked",
                                  e.target.checked,
                                )
                              }
                            />
                          </td>

                          <td className="col-product">
                            <strong>{line.product?.name || "—"}</strong>
                            <span>Inv #{line.inventory_id}</span>
                          </td>

                          <td className="col-num">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="col-num">{line.qty}</td>
                          <td className="col-num is-danger">
                            {line.total_returned_qty || 0}
                          </td>

                          <td className="col-qty">
                            <input
                              type="number"
                              className="sr-qty-input"
                              disabled={!lineState.checked || isDisabled}
                              min="0"
                              max={lineState.maxQty}
                              value={lineState.qty ?? ""}
                              onChange={(e) =>
                                handleLineChange(line.id, "qty", e.target.value)
                              }
                            />
                          </td>

                          <td className="col-num is-refund">
                            {lineState.checked
                              ? formatCurrency(lineRefund)
                              : "—"}
                          </td>

                          <td className="col-condition">
                            <select
                              className="sr-select"
                              disabled={!lineState.checked || isDisabled}
                              value={lineState.is_damaged ? "true" : "false"}
                              onChange={(e) =>
                                handleLineChange(
                                  line.id,
                                  "is_damaged",
                                  e.target.value === "true",
                                )
                              }
                            >
                              <option value="false">Good Stock</option>
                              <option value="true">Damaged</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sr-checkout-panel">
              <div className="sr-bill-card">
                <div className="sr-bill-row">
                  <span>Invoice</span>
                  <strong>{billData.bill_no}</strong>
                </div>
                <div className="sr-bill-row">
                  <span>Bill Total</span>
                  <strong className="is-green">
                    {formatCurrency(billData.total_amount)}
                  </strong>
                </div>
                <div className="sr-bill-row">
                  <span>Payment</span>
                  <span
                    className={`sr-status ${
                      billData.payment_status?.toLowerCase() === "paid"
                        ? "is-paid"
                        : "is-pending"
                    }`}
                  >
                    {billData.payment_status}
                  </span>
                </div>
                {billData.customer?.name && (
                  <div className="sr-bill-row">
                    <span>Customer</span>
                    <strong>{billData.customer.name}</strong>
                  </div>
                )}
              </div>

              <div className="sr-field">
                <label>Refund Method</label>
                <div className="sr-method-grid">
                  {REFUND_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      className={`sr-method-btn ${
                        refundType === method.value ? "is-active" : ""
                      }`}
                      onClick={() => setRefundType(method.value)}
                    >
                      {refundType === method.value && (
                        <CheckCircle2 size={14} />
                      )}
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sr-field">
                <label htmlFor="return-notes">Return Notes</label>
                <textarea
                  id="return-notes"
                  rows={3}
                  placeholder="Reason for return..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="sr-refund-box">
                <div className="sr-refund-label">
                  <IndianRupee size={18} />
                  Estimated Refund
                </div>
                <div className="sr-refund-amount">
                  {formatCurrency(returnSummary.refundTotal)}
                </div>
                <div className="sr-refund-meta">
                  {returnSummary.selectedCount} product
                  {returnSummary.selectedCount !== 1 ? "s" : ""} ·{" "}
                  {returnSummary.itemCount} qty
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmReturn}
                className="sr-submit-btn"
                disabled={submitting || returnSummary.selectedCount === 0}
              >
                {submitting ? (
                  <>
                    <span className="sr-spinner light" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw size={20} />
                    Submit Return
                  </>
                )}
              </button>

              {returnSummary.selectedCount === 0 && (
                <p className="sr-hint">
                  <AlertCircle size={14} />
                  Select items to return
                </p>
              )}
            </div>
          </div>
        )}

        <style>{`
          .sr-shell {
            min-height: calc(100vh - 74px);
            display: flex;
            flex-direction: column;
            background: #e8edf3;
            padding: 18px 20px 20px;
          }

          .sr-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 14px;
            flex-shrink: 0;
          }

          .sr-title {
            margin: 0 0 2px;
            font-size: 26px;
            font-weight: 700;
            color: #0f172a;
          }

          .sr-subtitle {
            margin: 0;
            font-size: 14px;
            color: #64748b;
          }

          .sr-search-bar {
            display: flex;
            align-items: stretch;
            gap: 10px;
            background: #fff;
            border-radius: 14px;
            padding: 10px 12px;
            box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
            margin-bottom: 14px;
            flex-shrink: 0;
          }

          .sr-search-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            color: var(--Main, #2275fc);
            flex-shrink: 0;
          }

          .sr-search-form {
            flex: 1;
            display: flex;
            gap: 10px;
            align-items: stretch;
          }

          .sr-search-form input {
            flex: 1;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 0 16px;
            font-size: 16px;
            font-weight: 500;
            background: #f8fafc;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .sr-search-form input:focus {
            outline: none;
            border-color: var(--Main, #2275fc);
            background: #fff;
            box-shadow: 0 0 0 3px rgba(34, 117, 252, 0.12);
          }

          .sr-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
          }

          .sr-btn-primary {
            min-width: 140px;
            padding: 0 20px;
            background: var(--Main, #2275fc);
            color: #fff;
          }

          .sr-btn-primary:hover:not(:disabled) {
            filter: brightness(1.05);
          }

          .sr-btn-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .sr-btn-ghost {
            padding: 0 16px;
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
          }

          .sr-btn-ghost:hover {
            background: #e2e8f0;
          }

          .sr-empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
            text-align: center;
            padding: 60px 24px;
            color: #64748b;
          }

          .sr-empty-icon {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background: linear-gradient(135deg, #eff6ff, #f0fdf4);
            color: var(--Main, #2275fc);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
          }

          .sr-empty-state h4 {
            margin: 0 0 8px;
            font-size: 22px;
            color: #0f172a;
          }

          .sr-empty-state p {
            margin: 0;
            font-size: 15px;
            max-width: 400px;
          }

          .sr-workspace {
            flex: 1;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 360px;
            gap: 14px;
            min-height: 0;
          }

          .sr-items-panel,
          .sr-checkout-panel {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
          }

          .sr-panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid #eef2f6;
            flex-shrink: 0;
          }

          .sr-panel-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }

          .sr-panel-meta {
            font-size: 13px;
            color: #64748b;
            font-weight: 600;
          }

          .sr-table-scroll {
            flex: 1;
            overflow: auto;
          }

          .sr-table {
            width: 95%;
            margin: 10px auto;
            border-collapse: collapse;
          }

          .sr-table thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #f8fafc;
            padding: 12px 14px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #64748b;
            white-space: nowrap;
          }

          .sr-table tbody td {
            padding: 14px;
            vertical-align: middle;
            font-size: 14px;
            color: #334155;
          }

          .sr-table tbody tr.is-selected {
            background: #eff6ff;
          }

          .sr-table tbody tr.is-disabled {
            opacity: 0.5;
          }

          .sr-table tbody tr:hover:not(.is-disabled) {
            background: #f8fafc;
          }

          .sr-table tbody tr.is-selected:hover {
            background: #dbeafe;
          }

          .sr-table .col-check { width: 48px; text-align: center; }
          .sr-table .col-product { min-width: 200px; }
          .sr-table .col-num { width: 100px; text-align: right; font-weight: 600; }
          .sr-table .col-num.is-danger { color: #dc2626; }
          .sr-table .col-num.is-refund { color: #059669; font-weight: 700; }
          .sr-table .col-qty { width: 100px; text-align: center; }
          .sr-table .col-condition { width: 140px; text-align: center; }

          .sr-table .col-product strong {
            display: block;
            font-size: 15px;
            color: #0f172a;
            margin-bottom: 2px;
          }

          .sr-table .col-product span {
            font-size: 12px;
            color: #94a3b8;
          }

          .sr-checkbox {
            width: 18px;
            height: 18px;
            accent-color: var(--Main, #2275fc);
            cursor: pointer;
          }

          .sr-qty-input {
            width: 72px;
            height: 38px;
            text-align: center;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
          }

          .sr-qty-input:focus {
            outline: none;
            border-color: var(--Main, #2275fc);
          }

          .sr-qty-input:disabled {
            background: #f1f5f9;
            color: #94a3b8;
          }

          .sr-select {
            width: 100%;
            height: 38px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 0 8px;
            font-size: 13px;
            background: #fff;
          }

          .sr-select:disabled {
            background: #f1f5f9;
            color: #94a3b8;
          }

          .sr-checkout-panel {
            padding: 18px;
            gap: 16px;
            overflow-y: auto;
          }

          .sr-bill-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .sr-bill-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
          }

          .sr-bill-row span:first-child {
            color: #64748b;
            font-weight: 600;
          }

          .sr-bill-row strong {
            color: #0f172a;
            font-size: 14px;
            text-align: right;
          }

          .sr-bill-row strong.is-green {
            color: #059669;
            font-size: 18px;
          }

          .sr-status {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
          }

          .sr-status.is-paid {
            background: #dcfce7;
            color: #15803d;
          }

          .sr-status.is-pending {
            background: #fef3c7;
            color: #b45309;
          }

          .sr-field label {
            display: block;
            margin-bottom: 8px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #64748b;
          }

          .sr-method-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .sr-method-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            padding: 10px 8px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
            color: #475569;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
          }

          .sr-method-btn.is-active {
            border-color: var(--Main, #2275fc);
            background: #eff6ff;
            color: #1d4ed8;
          }

          .sr-field textarea {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 14px;
            resize: vertical;
            font-family: inherit;
          }

          .sr-field textarea:focus {
            outline: none;
            border-color: var(--Main, #2275fc);
            box-shadow: 0 0 0 3px rgba(34, 117, 252, 0.1);
          }

          .sr-refund-box {
            background: linear-gradient(135deg,rgb(68, 158, 16) 0%,rgb(105, 197, 82) 100%);
            border-radius: 14px;
            padding: 18px;
            color: #fff;
            margin-top: auto;
          }

          .sr-refund-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #fff;
            margin-bottom: 4px;
          }

          .sr-refund-amount {
            font-size: 36px;
            font-weight: 800;
            line-height: 1.1;
            color: #fff;
            margin-bottom: 4px;
          }

          .sr-refund-meta {
            font-size: 12px;
            color: #fff;
          }

          .sr-submit-btn {
            width: 100%;
            height: 54px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);
            transition: transform 0.15s, box-shadow 0.15s;
          }

          .sr-submit-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
          }

          .sr-submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .sr-hint {
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 12px;
            color: #b45309;
          }

          .sr-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: srSpin 0.7s linear infinite;
          }

          .sr-spinner.light {
            border-color: rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
          }

          .sr-btn-primary .sr-spinner {
            border-color: rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
          }

          @keyframes srSpin {
            to { transform: rotate(360deg); }
          }

          @media (max-width: 1100px) {
            .sr-workspace {
              grid-template-columns: 1fr;
            }

            .sr-checkout-panel {
              order: -1;
            }

            .sr-refund-box {
              margin-top: 0;
            }
          }

          @media (max-width: 768px) {
            .sr-shell {
              margin: -15px;
              padding: 12px;
            }

            .sr-header {
              flex-direction: column;
            }

            .sr-search-bar {
              flex-wrap: wrap;
            }

            .sr-search-form {
              flex-direction: column;
              width: 100%;
            }

            .sr-btn-primary {
              width: 100%;
              height: 48px;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}
