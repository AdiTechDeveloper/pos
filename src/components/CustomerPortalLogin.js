import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ReceiptText,
  LogOut,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Package,
  Phone,
  ShieldCheck,
} from "lucide-react";

const CustomerPortalLogin = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [customerData, setCustomerData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [expandedTransaction, setExpandedTransaction] = useState(null);

  const fetchDashboard = useCallback(
    async (token) => {
      const response = await axios.get(
        `${BASE_URL}/api/customer-portal/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.data.status) {
        throw new Error(
          response.data.message || "Unable to load dashboard."
        );
      }

      setCustomerData(response.data);

      return response.data;
    },
    [BASE_URL]
  );

  useEffect(() => {
    const token = localStorage.getItem("customer_portal_token");

    if (!token) {
      setRestoringSession(false);
      return;
    }

    fetchDashboard(token)
      .catch((error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("customer_portal_token");
          setCustomerData(null);
        } else {
          setError(
            error.response?.data?.message ||
            "Unable to restore your session."
          );
        }
      })
      .finally(() => {
        setRestoringSession(false);
      });
  }, [fetchDashboard]);

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (mobile.length !== 10) {
      setError("Please enter a valid 10 digit mobile number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${BASE_URL}/api/customer-portal/send-otp`,
        {
          mobile,
        }
      );

      if (response.data.status) {
        setOtpSent(true);
      }
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter a valid 6 digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const verifyResponse = await axios.post(
        `${BASE_URL}/api/customer-portal/verify-otp`,
        {
          mobile,
          otp,
        }
      );

      if (!verifyResponse.data.status) {
        setError(
          verifyResponse.data.message || "Invalid OTP."
        );
        return;
      }

      const token = verifyResponse.data.token;

      if (!token) {
        setError("Authentication token was not received.");
        return;
      }

      localStorage.setItem("customer_portal_token", token);

      await fetchDashboard(token);
    } catch (error) {
      setError(
        error.response?.data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    const token = localStorage.getItem("customer_portal_token");

    if (!token) {
      setCustomerData(null);
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      await fetchDashboard(token);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("customer_portal_token");
        setCustomerData(null);
      } else {
        setError(
          error.response?.data?.message ||
          "Unable to refresh dashboard."
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleChangeMobile = () => {
    setOtpSent(false);
    setOtp("");
    setError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_portal_token");

    setCustomerData(null);
    setMobile("");
    setOtp("");
    setOtpSent(false);
    setError("");
    setExpandedTransaction(null);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleTransaction = (id) => {
    setExpandedTransaction((current) =>
      current === id ? null : id
    );
  };

  // Session restoring screen
  if (restoringSession) {
    return (
      <div
        style={{
          height: "100%", overflow: "scroll",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: "20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#475569",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              border: "4px solid #dbeafe",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              margin: "0 auto 14px",
              animation: "spin 0.8s linear infinite",
            }}
          />

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Loading your account...
          </p>

          <style>
            {`
              @keyframes spin {
                to {
                  transform: rotate(360deg);
                }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  if (customerData) {
    const { customer, summary, transactions = [] } =
      customerData;

    return (
      <div
        style={{
          height: "100%", overflow: "scroll",
          background: "#f8fafc",
          padding: "20px 14px 40px",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
              marginBottom: "18px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Customer Portal
              </p>

              <h1
                style={{
                  margin: "4px 0 0",
                  fontSize: "25px",
                  lineHeight: 1.2,
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                Hello, {customer.name} 👋
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginTop: "6px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                <Phone size={14} />
                {customer.mobile}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#334155",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  cursor: refreshing ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <RefreshCw
                  size={15}
                  style={{
                    animation: refreshing
                      ? "spin 0.8s linear infinite"
                      : "none",
                  }}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  border: "1px solid #fee2e2",
                  background: "#fff",
                  color: "#dc2626",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "11px 14px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              background:
                "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)",
              borderRadius: "20px",
              padding: "26px",
              color: "#fff",
              marginBottom: "16px",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 15px 35px rgba(37,99,235,0.22)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                right: "-60px",
                top: "-70px",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: 0.9,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Wallet size={17} />
                Available Advance Balance
              </div>

              <div
                style={{
                  fontSize: "38px",
                  fontWeight: 800,
                  marginTop: "10px",
                  letterSpacing: "-1px",
                }}
              >
                ₹{Number(summary.remaining || 0).toFixed(2)}
              </div>

              <div
                style={{
                  marginTop: "7px",
                  fontSize: "12px",
                  opacity: 0.8,
                }}
              >
                Your current wallet balance
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowDownCircle size={20} />
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    color: "#16a34a",
                    background: "#f0fdf4",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    fontWeight: 600,
                  }}
                >
                  CREDIT
                </span>
              </div>

              <p
                style={{
                  margin: "15px 0 4px",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Total Advance
              </p>

              <h3
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: "#0f172a",
                }}
              >
                ₹{Number(summary.total_advance || 0).toFixed(2)}
              </h3>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowUpCircle size={20} />
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    background: "#fef2f2",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    fontWeight: 600,
                  }}
                >
                  USED
                </span>
              </div>

              <p
                style={{
                  margin: "15px 0 4px",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Total Used
              </p>

              <h3
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: "#0f172a",
                }}
              >
                ₹{Number(summary.total_used || 0).toFixed(2)}
              </h3>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ReceiptText size={20} />
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    fontWeight: 600,
                  }}
                >
                  HISTORY
                </span>
              </div>

              <p
                style={{
                  margin: "15px 0 4px",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Transactions
              </p>

              <h3
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: "#0f172a",
                }}
              >
                {transactions.length}
              </h3>
            </div>
          </div>

          {/* Transactions */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 18px 15px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: "#0f172a",
                  fontWeight: 750,
                }}
              >
                Transaction History
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                Your advance payments and bill usage
              </p>
            </div>

            {transactions.length === 0 ? (
              <div
                style={{
                  padding: "45px 20px",
                  textAlign: "center",
                }}
              >
                <ReceiptText
                  size={38}
                  color="#cbd5e1"
                  style={{ marginBottom: "10px" }}
                />

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  No transactions found.
                </p>
              </div>
            ) : (
              <div>
                {transactions.map((transaction) => {
                  const isCredit =
                    transaction.type === "credit";

                  const bill = transaction.bill;
                  const isExpanded =
                    expandedTransaction === transaction.id;

                  return (
                    <div
                      key={transaction.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          padding: "16px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              minWidth: "42px",
                              borderRadius: "12px",
                              background: isCredit
                                ? "#ecfdf5"
                                : "#fef2f2",
                              color: isCredit
                                ? "#16a34a"
                                : "#dc2626",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isCredit ? (
                              <ArrowDownCircle size={21} />
                            ) : (
                              <ArrowUpCircle size={21} />
                            )}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#0f172a",
                              }}
                            >
                              {isCredit
                                ? "Advance Payment"
                                : bill
                                  ? `Bill #${bill.bill_no}`
                                  : "Advance Used"}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginTop: "4px",
                                color: "#64748b",
                                fontSize: "11px",
                              }}
                            >
                              <CalendarDays size={12} />

                              {formatDate(
                                transaction.created_at
                              )}
                            </div>

                            {!isCredit && bill && (
                              <div
                                style={{
                                  marginTop: "5px",
                                  color: "#64748b",
                                  fontSize: "11px",
                                }}
                              >
                                Bill total ₹
                                {Number(
                                  bill.total_amount || 0
                                ).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: 800,
                              color: isCredit
                                ? "#16a34a"
                                : "#dc2626",
                            }}
                          >
                            {isCredit ? "+" : "-"}₹
                            {Number(
                              transaction.amount || 0
                            ).toFixed(2)}
                          </div>

                          {!isCredit && bill && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleTransaction(
                                  transaction.id
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                                marginTop: "7px",
                                marginLeft: "auto",
                                border: "none",
                                background: "transparent",
                                color: "#2563eb",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: 0,
                              }}
                            >
                              {isExpanded
                                ? "Hide bill"
                                : "View bill"}

                              {isExpanded ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bill Details */}
                      {isExpanded && bill && (
                        <div
                          style={{
                            margin: "0 18px 16px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              padding: "13px 14px",
                              borderBottom:
                                "1px solid #e2e8f0",
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 700,
                                  color: "#0f172a",
                                }}
                              >
                                Bill #{bill.bill_no}
                              </div>

                              <div
                                style={{
                                  marginTop: "3px",
                                  color: "#64748b",
                                  fontSize: "11px",
                                }}
                              >
                                {formatDateTime(
                                  bill.bill_date
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                textAlign: "right",
                              }}
                            >
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: "10px",
                                }}
                              >
                                Advance Used
                              </div>

                              <strong
                                style={{
                                  color: "#dc2626",
                                  fontSize: "14px",
                                }}
                              >
                                ₹
                                {Number(
                                  transaction.amount || 0
                                ).toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          {/* Items */}
                          <div
                            style={{
                              padding: "8px 14px",
                            }}
                          >
                            {bill.items?.length > 0 ? (
                              bill.items.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    display: "flex",
                                    justifyContent:
                                      "space-between",
                                    gap: "10px",
                                    padding:
                                      "10px 0",
                                    borderBottom:
                                      "1px solid #e2e8f0",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "9px",
                                      minWidth: 0,
                                    }}
                                  >
                                    <Package
                                      size={16}
                                      color="#64748b"
                                      style={{
                                        marginTop: "2px",
                                        flexShrink: 0,
                                      }}
                                    />

                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            "12px",
                                          fontWeight: 600,
                                          color:
                                            "#334155",
                                        }}
                                      >
                                        {item.product_name ||
                                          "Product"}
                                      </div>

                                      <div
                                        style={{
                                          marginTop:
                                            "3px",
                                          fontSize:
                                            "10px",
                                          color:
                                            "#64748b",
                                        }}
                                      >
                                        {item.qty} × ₹
                                        {Number(
                                          item.rate || 0
                                        ).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      fontSize:
                                        "12px",
                                      fontWeight: 700,
                                      color:
                                        "#0f172a",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    ₹
                                    {Number(
                                      item.amount || 0
                                    ).toFixed(2)}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div
                                style={{
                                  padding:
                                    "12px 0",
                                  color:
                                    "#64748b",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                No item details available.
                              </div>
                            )}
                          </div>

                          {/* Bill Summary */}
                          <div
                            style={{
                              padding: "12px 14px",
                              background: "#fff",
                              borderTop:
                                "1px solid #e2e8f0",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                fontSize: "12px",
                                color: "#64748b",
                                marginBottom:
                                  "6px",
                              }}
                            >
                              <span>
                                Bill Total
                              </span>

                              <span>
                                ₹
                                {Number(
                                  bill.total_amount ||
                                  0
                                ).toFixed(2)}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                fontSize: "12px",
                                color: "#64748b",
                                marginBottom:
                                  "6px",
                              }}
                            >
                              <span>
                                Paid Amount
                              </span>

                              <span>
                                ₹
                                {Number(
                                  bill.paid_amount ||
                                  0
                                ).toFixed(2)}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#0f172a",
                              }}
                            >
                              <span>
                                Due Amount
                              </span>

                              <span>
                                ₹
                                {Number(
                                  bill.due_amount || 0
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "20px",
              color: "#94a3b8",
              fontSize: "11px",
            }}
          >
            <ShieldCheck size={13} />
            Your customer account is protected
          </div>
        </div>

        <style>
          {`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }

            @media (max-width: 520px) {
              body {
                margin: 0;
              }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%", overflow: "scroll",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eef2ff 100%)",
        padding: "20px 14px",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "16px",
            background:
              "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 15px",
            boxShadow:
              "0 10px 25px rgba(37,99,235,0.25)",
          }}
        >
          <Wallet size={28} />
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "28px 22px",
            boxShadow:
              "0 20px 50px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "25px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Customer Portal
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              View your advance balance,
              payments and bills
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "11px 12px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Mobile Number
              </label>

              <div
                style={{
                  position: "relative",
                }}
              >
                <Phone
                  size={17}
                  color="#94a3b8"
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "15px",
                  }}
                />

                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )
                  }
                  placeholder="Enter 10 digit mobile"
                  style={{
                    width: "100%",
                    height: "48px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "0 14px 0 42px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                    color: "#0f172a",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: "48px",
                  marginTop: "16px",
                  border: "none",
                  borderRadius: "10px",
                  background: loading
                    ? "#93c5fd"
                    : "#2563eb",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  boxShadow:
                    "0 8px 18px rgba(37,99,235,0.18)",
                }}
              >
                {loading ? "Sending OTP..." : "Continue"}
              </button>

              <p
                style={{
                  margin: "14px 0 0",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "11px",
                }}
              >
                An OTP will be sent to your registered
                mobile number.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: "10px",
                  padding: "11px 12px",
                  marginBottom: "18px",
                  color: "#1d4ed8",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                OTP sent to +91 {mobile}
              </div>

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Enter OTP
              </label>

              <input
                type="text"
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="••••••"
                maxLength={6}
                autoFocus
                style={{
                  width: "100%",
                  height: "52px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontSize: "22px",
                  letterSpacing: "8px",
                  textAlign: "center",
                  boxSizing: "border-box",
                  outline: "none",
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: "48px",
                  marginTop: "16px",
                  border: "none",
                  borderRadius: "10px",
                  background: loading
                    ? "#86efac"
                    : "#16a34a",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  boxShadow:
                    "0 8px 18px rgba(22,163,74,0.18)",
                }}
              >
                {loading
                  ? "Verifying..."
                  : "Verify & Continue"}
              </button>

              <button
                type="button"
                onClick={handleChangeMobile}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: "13px",
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Change mobile number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalLogin;