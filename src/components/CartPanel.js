import React, { useState, useRef, useEffect } from "react";
import { createSalesBill, paySalesBill } from "../utils/api";
import PaymentModal from "./PaymentModal";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ReceiptModal from "./ReceiptModal";
import EndShiftModal from "./EndShiftModal";
import AddAdvanceModal from "./AddAdvanceModal";
import {
  ShoppingBag,
  Calendar,
  Minus,
  Plus,
  X,
  Check,
  Pencil,
  RotateCcw,
  AlertTriangle,
  Coffee,
  LogOut,
  LayoutDashboard,
  Wallet,
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : {};
};

export default function CartPanel({
  cart,
  setCart,
  triggerRefresh,
  onPriceUpdated,
  branchId,
}) {
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const todayFormatted = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayFormatted);
  localStorage.setItem("cart_detail", JSON.stringify(cart));
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const role = user_data?.user?.role || user_data?.role;
  const receiptRef = useRef();
  const [showReceipt, setShowReceipt] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [priceOverrides, setPriceOverrides] = useState({});
  const [showEndShift, setShowEndShift] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);

  const getPriceWithGST = (item) => {
    const sellingPrice = parseFloat(item.selling_price) || 0;
    const gstRate = parseFloat(item.gst_percent) || 0;
    const isInclusive = Number(item.gst_inclusive) === 1;

    if (gstRate > 0 && isInclusive) {
      const taxable = (sellingPrice * 100) / (100 + gstRate);
      const gstAmount = sellingPrice - taxable;
      return { taxable, gstAmount, finalPrice: sellingPrice };
    } else {
      const gstAmount = (sellingPrice * gstRate) / 100;
      return {
        taxable: sellingPrice,
        gstAmount,
        finalPrice: sellingPrice + gstAmount,
      };
    }
  };

  const total = cart.reduce((acc, item) => {
    const { finalPrice } = getPriceWithGST(item);
    return acc + finalPrice * item.qty;
  }, 0);

  const subtotal = cart.reduce((acc, item) => {
    const { taxable } = getPriceWithGST(item);
    return acc + taxable * item.qty;
  }, 0);
  const gstTotal = cart.reduce((acc, item) => {
    const { gstAmount } = getPriceWithGST(item);
    return acc + gstAmount * item.qty;
  }, 0);

  const itemCount = cart.length;
  const totalQty = cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);

  localStorage.setItem("cart_total", total);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F9" && cart.length > 0 && !showPayment) {
        e.preventDefault();
        setShowPayment(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, showPayment]);

  const increaseQty = (item) => {
    setCart(
      cart.map((i) =>
        i.cart_key === item.cart_key ? { ...i, qty: i.qty + 1 } : i,
      ),
    );
  };

  const decreaseQty = (item) => {
    setCart(
      cart.map((i) =>
        i.cart_key === item.cart_key
          ? { ...i, qty: Math.max(i.qty - 1, 1) }
          : i,
      ),
    );
  };

  const removeItem = (item) => {
    setCart(cart.filter((i) => i.cart_key !== item.cart_key));
    setPriceOverrides((prev) => {
      const updated = { ...prev };
      delete updated[item.cart_key];
      return updated;
    });
  };

  const startPriceEdit = (item) => {
    setPriceOverrides((prev) => ({
      ...prev,
      [item.cart_key]: {
        editing: true,
        tempValue: String(item.selling_price),
      },
    }));
  };

  const cancelPriceEdit = (item) => {
    setPriceOverrides((prev) => ({
      ...prev,
      [item.cart_key]: { editing: false, tempValue: "" },
    }));
  };

  const confirmPriceOverride = async (item) => {
    const override = priceOverrides[item.cart_key];
    if (!override) return;

    const newPrice = parseFloat(override.tempValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (!item.inventory_id) {
      toast.error("Inventory ID not found");
      return;
    }

    try {
      const response = await axios.put(
        `${BASE_URL}/api/inventory/${item.inventory_id}/selling-price`,
        { selling_price: newPrice },
        { headers: getAuthHeader() },
      );

      if (response.data.status) {
        const originalPrice = parseFloat(
          item.original_price || item.selling_price,
        );

        setCart((prev) =>
          prev.map((i) =>
            i.cart_key === item.cart_key
              ? {
                  ...i,
                  selling_price: newPrice,
                  original_price: i.original_price || i.selling_price,
                  is_price_overridden: true,
                }
              : i,
          ),
        );

        setPriceOverrides((prev) => ({
          ...prev,
          [item.cart_key]: { editing: false, tempValue: "" },
        }));

        if (onPriceUpdated) onPriceUpdated();

        toast.success(
          `Price updated: ₹${originalPrice.toFixed(2)} → ₹${newPrice.toFixed(2)}`,
        );
      }
    } catch (error) {
      console.error("Price override error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update product price",
      );
    }
  };

  const resetPrice = (item) => {
    if (!item.original_price) return;
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === item.product_id || i.inventory_id === item.inventory_id
          ? { ...i, selling_price: i.original_price, is_price_overridden: false }
          : i,
      ),
    );
    toast.info("Price reset to original");
  };

  const handlePayment = async (payloadOrPayments) => {
    try {
      const lines = cart.map((i) => ({
        product_id: i.product_id || i.id,
        inventory_id: i.inventory_id || i.inventoryId,
        qty: i.qty,
        selling_price: i.selling_price,
        original_price: i.original_price || i.selling_price,
        is_price_overridden: i.is_price_overridden || false,
      }));

      let payments = [];
      let payment_type = null;
      let customer = null;
      let points_redeemed = 0;

      if (Array.isArray(payloadOrPayments)) {
        payments = payloadOrPayments;
      } else if (payloadOrPayments && payloadOrPayments.payments) {
        payments = payloadOrPayments.payments;
        payment_type = payloadOrPayments.payment_type || null;
        customer = payloadOrPayments.customer || null;
        points_redeemed = payloadOrPayments.points_redeemed || 0;
      }

      const createPayload = { lines, selected_date: selectedDate };
      if (branchId) createPayload.branch_id = branchId;
      if (payment_type) createPayload.payment_type = payment_type;
      if (customer) createPayload.customer = customer;
      if (points_redeemed > 0) createPayload.points_redeemed = points_redeemed;

      const res = await createSalesBill(createPayload);
      const billId = res.data.data.id;

      if (payments && payments.length > 0) {
        await paySalesBill(billId, payments);
      }

      const printRes = await axios.post(
        `${BASE_URL}/api/sales-bill/print-data`,
        { id: [billId] },
        { headers: getAuthHeader() },
      );

      setPrintData(printRes.data);
      setShowReceipt(true);

      toast.success("Sales bill created successfully!");
      setCart([]);
      setPriceOverrides({});
      triggerRefresh();
      setShowPayment(false);
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      toast.error(serverMessage || "Error processing payment");
      console.error("Payment Error:", err);
    }
  };

  const finishLogout = async () => {
    try {
      const user_detail = localStorage.getItem("user_detail");
      const user = user_detail ? JSON.parse(user_detail) : null;

      await axios.post(
        `${BASE_URL}/api/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            Accept: "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Logout API error:", error);
    }

    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
    });

    localStorage.removeItem("user_detail", "cart_detail", "cart_detail");
    sessionStorage.clear();
    navigate("/cashier_login");
  };

  const handleBreak = async () => {
    try {
      const user_detail = localStorage.getItem("user_detail");
      const user = user_detail ? JSON.parse(user_detail) : null;

      await axios.post(
        `${BASE_URL}/api/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            Accept: "application/json",
          },
        },
      );
    } catch (error) {
      // Ignore logout API errors
    }

    localStorage.removeItem("user_detail", "cart_detail", "cart_detail");
    sessionStorage.clear();
    navigate("/cashier_login");
  };

  const handleEndShiftClick = (e) => {
    e.preventDefault();
    const branchIdForShift =
      user_data?.user?.branch_ids?.[0] || user_data?.branch_ids?.[0];

    if (!branchIdForShift) {
      toast.error("No branch assigned to your account. Please contact admin.");
      return;
    }
    setShowEndShift(true);
  };

  const handleShiftClosed = () => {
    setShowEndShift(false);
    finishLogout();
  };

  const printReceipt = () => {
    const printContent = receiptRef.current;
    const win = window.open("", "", "width=800,height=600");
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            @page { size: auto; margin: 15mm 10mm 10mm 10mm; }
            body { margin: 0; padding: 0; font-family: "Poppins", sans-serif; }
            .receipt-print { margin-top: 12mm; }
            hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="receipt-print">${printContent.innerHTML}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const isProductOverrideAllowed = (item) => {
    return Number(item.is_price_override) === 1;
  };

  // ---- dark theme tokens ----
  const colors = {
    bg: "#14161c",
    panelBorder: "#262a35",
    itemBg: "#1b1e26",
    itemBorder: "#2a2e3a",
    text: "#f4f5f7",
    textMuted: "#8b92a3",
    accent: "#f0a04b", // Pay button amber, matching screenshot
  };

  return (
    <div
      className="pos-cart flex flex-col h-full"
      style={{
        background: colors.bg,
        color: colors.text,
        padding: "20px",
        borderRadius: "16px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ShoppingBag size={22} />
          <h2 className="font-bold" style={{ fontSize: "22px" }}>
            Your cart
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {role === "cashier" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#4ade80",
                borderRadius: "999px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                }}
              />
              Shift Open
            </span>
          )}

          {role !== "cashier" ? (
            <Link
              to="/dashboard"
              title="Go to Dashboard"
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: colors.itemBg,
                border: `1px solid ${colors.itemBorder}`,
                color: colors.text,
              }}
            >
              <LayoutDashboard size={16} />
            </Link>
          ) : (
            <>
              <button
                onClick={handleBreak}
                title="Take a break"
                className="flex items-center justify-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: colors.itemBg,
                  border: `1px solid ${colors.itemBorder}`,
                  color: colors.text,
                }}
              >
                <Coffee size={16} />
              </button>
              <button
                onClick={handleEndShiftClick}
                title="End Shift"
                className="flex items-center justify-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                }}
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <p style={{ color: colors.textMuted, fontSize: "13px", marginBottom: "16px" }}>
        {itemCount} {itemCount === 1 ? "item" : "items"} · {totalQty} qty
      </p>

      {/* Bill date */}
      <div
        className="relative flex items-center justify-between mb-5"
        style={{
          background: "#fff",
          border: `1px solid ${colors.itemBorder}`,
          borderRadius: "12px",
          padding: "12px 16px",
        }}
      >
        <span style={{ color:"#000", fontSize: "14px" }}>Bill date</span>
        <div className="flex items-center gap-2" style={{ position: "relative" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>
            {new Date(selectedDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).replace(/\//g, "-")}
          </span>
          <Calendar size={18} style={{ color: "#fff" }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                border: `1px solid ${colors.itemBorder}`,
                color: "#000",
              }}
            >
              <ShoppingBag size={24} />
            </div>
            <p style={{ fontWeight: 700, fontSize: "18px" }}>Your cart is empty</p>
            <p style={{ color: colors.textMuted, fontSize: "13px", marginTop: "6px" }}>
              Scan a barcode or tap Add on a product
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const { gstAmount, finalPrice } = getPriceWithGST(item);
            const override = priceOverrides[item.cart_key];
            const isEditing = override?.editing;
            const isOverridden = item.is_price_overridden && item.original_price;

            return (
              <div
                key={`${item.inventory_id}_${item.selling_price}`}
                className="rounded-xl mb-3 p-3"
                style={{
                  background: "#fff",
                  border: isOverridden
                    ? "1px solid #f59e0b"
                    : `1px solid gray`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontWeight: 700, fontSize: "15px" }}>{item.name}</p>
                  {isOverridden && (
                    <span
                      className="flex items-center gap-1"
                      style={{
                        fontSize: "13px",
                        background: "rgba(243, 44, 37, 0.12)",
                        color: "#e13a1d",
                        border: "1px solid rgba(245,158,11,0.3)",
                        borderRadius: "6px",
                        padding: "2px 7px",
                        fontWeight: 600,
                      }}
                    >
                      <AlertTriangle size={11} />
                      Overridden
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: "#000", fontSize: "13px" }}>
                      Unit:
                    </span>

                    {isOverridden && (
                      <span
                        style={{
                          textDecoration: "line-through",
                          color:  "#000",
                          fontSize: "13px",
                        }}
                      >
                        ₹{Number(item.original_price).toFixed(2)}
                      </span>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={override.tempValue}
                          autoFocus
                          onChange={(e) =>
                            setPriceOverrides((prev) => ({
                              ...prev,
                              [item.cart_key]: {
                                ...prev[item.cart_key],
                                tempValue: e.target.value,
                              },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmPriceOverride(item);
                            if (e.key === "Escape") cancelPriceEdit(item);
                          }}
                          style={{
                            width: "90px",
                            background: "#fff",
                            border: "1px solid #d81b1b",
                            borderRadius: "6px",
                            padding: "3px 6px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#e92a15",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => confirmPriceOverride(item)}
                          title="Confirm"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: "rgba(34,197,94,0.15)",
                            color: "#258e4b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => cancelPriceEdit(item)}
                          title="Cancel"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: "rgba(239,68,68,0.15)",
                            color: "#da3f3f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "16px",
                          color: isOverridden ? "#b71e16" : "#000",
                        }}
                      >
                        ₹{Number(item.selling_price).toFixed(2)}{" "}
                        <span style={{ fontWeight: 400, color: colors.textMuted, fontSize: "11px" }}>
                          ({Number(item.gst_inclusive) === 1 ? "Incl." : "Excl."} GST)
                        </span>
                      </span>
                    )}

                    {!isEditing && isProductOverrideAllowed(item) && (
                      <>
                        <button
                          onClick={() => startPriceEdit(item)}
                          title="Override price"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: `1px solid ${colors.itemBorder}`,
                            color: colors.textMuted,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                        {isOverridden && (
                          <button
                            onClick={() => resetPrice(item)}
                            title="Reset to original price"
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              border: "1px solid rgba(245,158,11,0.3)",
                              color: "#fbbf24",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => decreaseQty(item)}
                      title="Decrease"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "gray",
                        border: `1px solid gray`,
                        color: colors.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus size={13} />
                    </button>

                    <input
                      type="text"
                      value={item.qty}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val === "") {
                          setCart((prev) =>
                            prev.map((i) =>
                              i.inventory_id === item.inventory_id
                                ? { ...i, qty: "" }
                                : i,
                            ),
                          );
                          return;
                        }
                        const newQty = Math.max(1, Number(val));
                        setCart((prev) =>
                          prev.map((i) =>
                            i.inventory_id === item.inventory_id
                              ? { ...i, qty: newQty }
                              : i,
                          ),
                        );
                      }}
                      style={{
                        width: 32,
                        textAlign: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                        background: "transparent",
                        color: "#000",
                      
                        appearance: "textfield",
                      }}
                    />

                    <button
                      onClick={() => increaseQty(item)}
                      title="Increase"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "gray",
                        border: `1px solid gray`,
                        color: colors.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={13} />
                    </button>

                    <button
                      onClick={() => removeItem(item)}
                      title="Remove"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "rgba(239,68,68,0.12)",
                        color: "#f87171",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between" style={{ fontSize: "12px", color: colors.textMuted }}>
                  <span>
                    GST ({item.gst_percent}%): ₹{(gstAmount * item.qty).toFixed(2)}
                  </span>
                  <span style={{ fontWeight: 700, color: "#4ade80" , marginTop:"10px" , fontSize: "16px"}}>
                    ₹{(finalPrice * item.qty).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Subtotal / GST / Total / Actions */}
      <div style={{ borderTop: `1px solid ${colors.panelBorder}`, paddingTop: "16px", marginTop: "12px" }}>
        <div className="flex justify-between" style={{ fontSize: "16px", color: colors.textMuted, marginBottom: "6px" }}>
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between" style={{ fontSize: "16px", color: colors.textMuted, marginBottom: "12px" }}>
          <span>GST</span>
          <span>₹{gstTotal.toFixed(2)}</span>
        </div>
        <div
          className="flex justify-between items-center"
          style={{
            borderTop: `1px dashed ${colors.panelBorder}`,
            paddingTop: "12px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "16px" }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: "22px" }}>₹{total.toFixed(2)}</span>
        </div>

        <button
          onClick={() => setShowPayment(true)}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2"
          style={{
            background:"#1fb54c",
            color: "#fff",
            padding: "14px",
            border: '1px solid #13903f',
            borderRadius: "14px",
            fontSize: "17px",
            fontWeight: 800,
            opacity: cart.length === 0 ? 0.5 : 1,
            cursor: cart.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Pay ₹{total.toFixed(2)}
          {/* <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              background: "rgba(0,0,0,0.15)",
              borderRadius: "5px",
              padding: "2px 6px",
              marginLeft: "4px",
            }}
          >
            F9
          </span> */}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddAdvance(true)}
          className="w-full flex items-center justify-center gap-2 mt-3"
          style={{
            background: "#13858b",
            border: `1px solid #1eb1c2`,
            color:" #fff",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <Wallet size={16} />
          Add advance
        </button>

        <button
          onClick={() => navigate("/customer-dues")}
          className="w-full flex items-center justify-center gap-2 mt-3"
          style={{
            background: "#e6414c",
            border: `1px solid #fecdd3`,
            color:" #fff",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Customer Dues
        </button>
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePayment}
          cart_data={cart}
        />
      )}

      {showReceipt && printData && (
        <ReceiptModal
          ref={receiptRef}
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          onPrint={printReceipt}
          data={printData}
          cart_detail={printData.items}
          cart_total={printData.total}
        />
      )}

      {showEndShift && (
        <EndShiftModal
          isOpen={showEndShift}
          branchId={user_data?.user?.branch_ids?.[0] || user_data?.branch_ids?.[0]}
          onClose={() => setShowEndShift(false)}
          onShiftClosed={handleShiftClosed}
        />
      )}

      {showAddAdvance && (
        <AddAdvanceModal
          onClose={() => setShowAddAdvance(false)}
          onSuccess={() => {
            toast.success("Advance added successfully!");
          }}
        />
      )}
    </div>
  );
}