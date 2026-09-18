import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeader = () => {
  const raw = localStorage.getItem("user_detail");
  const parsed = raw ? JSON.parse(raw) : null;
  const token = parsed?.token || parsed?.user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function EndShiftModal({
  isOpen,
  branchId,
  onClose,
  onShiftClosed,
}) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [actualBalance, setActualBalance] = useState("");
  const [otherExpenses, setOtherExpenses] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSummary(null);
    setActualBalance("");
    setOtherExpenses("");
    setExpenseDesc("");
    setLoadingSummary(true);

    axios
      .get(`${BASE_URL}/api/staff/shift-summary`, {
        params: { branch_id: branchId },
        headers: getAuthHeader(),
      })
      .then((res) => setSummary(res.data))
      .catch((err) => {
        toast.error(
          err.response?.data?.message || "Could not load shift summary",
        );
        onClose();
      })
      .finally(() => setLoadingSummary(false));
  }, [isOpen, branchId]);

  if (!isOpen) return null;

  const opening = Number(summary?.opening_balance ?? 0);
  const cashIn = Number(summary?.cash_collected ?? 0);
  const expensesNum = parseFloat(otherExpenses) || 0;
  const grossTotal = opening + cashIn;
  const expected = grossTotal - expensesNum;

  const actualNum = parseFloat(actualBalance);
  const hasActual = actualBalance !== "" && !isNaN(actualNum);
  const discrepancy = hasActual ? actualNum - expected : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasActual || actualNum < 0) {
      toast.error("Please enter a valid closing cash amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/staff/close-register`,
        {
          closing_balance: actualNum,
          other_expenses: expensesNum,
          expense_description: expenseDesc.trim() || null,
        },
        { params: { branch_id: branchId }, headers: getAuthHeader() },
      );
      toast.success("Shift closed successfully");
      onShiftClosed(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Error closing shift. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      {/* Dialog */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #cc51dc, #354a9f)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Row container for Icon and H2 */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <img
                src="/assets/images/logo/dismissal.png"
                style={{ width: "40px", height: "40px" }}
                alt="End Shift Icon"
              />
              <h2
                style={{
                  color: "#fff",
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                End Shift
              </h2>
            </div>

            {/* Paragraph below the row */}
            <p
              style={{
                color: "#ffffff",
                margin: "5px 0 0 0",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Close your register and submit cash count
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255)",
              border: "none",
              color: "#000000",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {loadingSummary ? (
            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                padding: "24px 0",
              }}
            >
              Loading shift summary…
            </p>
          ) : (
            <>
              {/* Cash Breakdown Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                {[
                  {
                    label: "Opening balance",
                    value: opening,
                    color: "#111",
                    prefix: "",
                  },
                  {
                    label: "Cash collected",
                    value: cashIn,
                    color: "#16a34a",
                    prefix: "+",
                  },
                ].map(({ label, value, color, prefix }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    <span>{label}</span>
                    <strong style={{ color }}>
                      {prefix}₹{value.toFixed(2)}
                    </strong>
                  </div>
                ))}

                <div
                  style={{ borderTop: "1px dashed #cbd5e1", margin: "10px 0" }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  <span>Gross total</span>
                  <strong>₹{grossTotal.toFixed(2)}</strong>
                </div>

                {expensesNum > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      marginTop: "5px",
                    }}
                  >
                    <span style={{ color: "#dc2626" }}>Other expenses</span>
                    <strong style={{ color: "#dc2626" }}>
                      −₹{expensesNum.toFixed(2)}
                    </strong>
                  </div>
                )}

                <div
                  style={{ borderTop: "2px solid #1e3a5f", margin: "10px 0" }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "16px",
                  }}
                >
                  <strong style={{ color: "#1e3a5f" }}>
                    Expected in drawer
                  </strong>
                  <strong style={{ color: "#2563eb", fontSize: "18px" }}>
                    ₹{expected.toFixed(2)}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Expenses row */}
                <div
                  style={{ display: "flex", gap: "12px", marginBottom: "14px" }}
                >
                  <div style={{ flex: "0 0 130px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Other expenses (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={otherExpenses}
                      onChange={(e) => setOtherExpenses(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tea, courier"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Actual cash */}
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Actual cash counted{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={actualBalance}
                    onChange={(e) => setActualBalance(e.target.value)}
                    required
                    style={{
                      ...inputStyle,
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#1e3a5f",
                    }}
                  />
                </div>

                {/* Discrepancy badge */}
                {hasActual &&
                  discrepancy !== null &&
                  Math.abs(discrepancy) > 0.01 && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        fontWeight: 600,
                        fontSize: "14px",
                        background: discrepancy < 0 ? "#fef2f2" : "#f0fdf4",
                        color: discrepancy < 0 ? "#dc2626" : "#16a34a",
                        border: `1px solid ${discrepancy < 0 ? "#fecaca" : "#bbf7d0"}`,
                      }}
                    >
                      {discrepancy < 0
                        ? `⚠ Short by ₹${Math.abs(discrepancy).toFixed(2)}`
                        : `✓ Excess of ₹${discrepancy.toFixed(2)}`}
                    </div>
                  )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1.5px solid #d1d5db",
                      background: "#fff",
                      color: "#374151",
                      fontSize: "15px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 2,
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: submitting
                        ? "#93c5fd"
                        : "linear-gradient(135deg, #cc51dc, #354a9f)",
                      color: "#fff",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                    }}
                  >
                    {submitting ? "Closing…" : "✓ Confirm & Logout"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};
