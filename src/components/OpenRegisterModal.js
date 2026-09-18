import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const OpenRegisterModal = ({ isOpen, branchId, onRegisterOpened }) => {
  const [balance, setBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const raw = localStorage.getItem("user_detail");
    const parsed = raw ? JSON.parse(raw) : null;
    const token = parsed?.token || parsed?.user?.token;

    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${BASE_URL}/api/staff/open-register`,
        { opening_balance: balance },
        {
          params: { branch_id: branchId },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Shift started successfully!");
      onRegisterOpened(); // Closes the modal
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Error starting shift. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  
   return (
  /* ── Backdrop ── */
  <div style={{
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  }}>
    {/* ── Dialog ── */}
    <div style={{
      background: "#fff",
      borderRadius: "16px",
      boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
      width: "100%",
      maxWidth: "420px",
      overflow: "hidden",
      fontFamily: "'Poppins', sans-serif",
    }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgb(208 105 183), rgb(43 206 156))",
        padding: "12px",
        textAlign: "center",
      }}>
        {/* <div style={{ fontSize: "36px" }}>🏪</div> */}
        <h2 style={{ color: "#fff", margin: 0, padding:0 , fontSize: "20px", fontWeight: 700 }}>
          Start New Shift
        </h2>
        <p style={{ color: "#ffffff", fontSize: "13px" }}>
          Enter your opening cash balance to activate the register
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 24px" }}>

        {/* Info box */}
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          color: "#065f46",
        }}>
          <span style={{ fontSize: "18px" }}>💡</span>
          Count the physical cash in your drawer and enter the total below.
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{
            display: "block",
            fontSize: "13px",
            color: "#000000",
            marginBottom: "6px",
            fontWeight: 500,
          }}>
            Opening cash balance (₹) <span style={{ color: "#ef4444" }}>*</span>
          </label>

          <div style={{ position: "relative", marginBottom: "24px" }}>
            <span style={{
              position: "absolute", left: "14px", top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px", fontWeight: 700, color: "#6b7280",
            }}>₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%",
                padding: "14px 14px 14px 36px",
                border: "2px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "22px",
                fontWeight: 700,
                color: "#064e3b",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#10b981"}
              onBlur={(e)  => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "none",
              background: submitting
                ? "#6ee7b7"
                : "linear-gradient(135deg, rgb(208 105 183), rgb(43 206 156))",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
              letterSpacing: "0.3px",
            }}
          >
            {submitting ? "Starting shift…" : "🚀 Start Shift"}
          </button>
        </form>
      </div>
    </div>
  </div>

  );
};

export default OpenRegisterModal;