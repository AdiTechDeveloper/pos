import React, { useState, useRef } from "react";
import { createSalesBill, paySalesBill } from "../utils/api";
import PaymentModal from "./PaymentModal";
import { toast } from "react-toastify";
// import { Link, Navigate, useNavigate } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ReceiptModal from "./ReceiptModal";
import EndShiftModal from "./EndShiftModal";
import AddAdvanceModal from "./AddAdvanceModal";

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
  // const navigate = useNavigate();
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

  localStorage.setItem("cart_total", total);

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

  // Price Override Handlers
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
        {
          selling_price: newPrice,
        },
        {
          headers: getAuthHeader(),
        },
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
          [item.cart_key]: {
            editing: false,
            tempValue: "",
          },
        }));

        if (onPriceUpdated) {
          onPriceUpdated();
        }

        toast.success(
          `Price updated: ₹${originalPrice.toFixed(
            2,
          )} → ₹${newPrice.toFixed(2)}`,
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
          ? {
              ...i,
              selling_price: i.original_price,
              is_price_overridden: false,
            }
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

      const createPayload = {
        lines,
        selected_date: selectedDate,
      };
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
    // navigate("/cashier_login");
    navigate("/cashier_login");
  };

  const handleEndShiftClick = (e) => {
    e.preventDefault();

    const branchId =
      user_data?.user?.branch_ids?.[0] || user_data?.branch_ids?.[0];

    if (!branchId) {
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

  return (
    <>
      <div className="pos-cart min-h-screen bg-slate-50 p-6">
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-2xl">🛒</span>
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Your cart
          </h2>

          <p className="text-md text-slate-500 mt-1">
            {cart.length} items ·{" "}
            {cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)} qty
          </p>
        </div>
      </div>

      {role === "cashier" && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "13px",
            fontWeight: 600,
            marginTop: "10px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
            }}
          />
          Shift Open
        </span>
      )}
    </div>

    {role !== "cashier" ? (
      <Link
        to="/dashboard"
        className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition"
      >
        Dashboard
      </Link>
    ) : (
      <div className="flex gap-2">
        <button
          onClick={handleBreak}
          className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm transition"
        >
          🔒 Break
        </button>

        <button
          onClick={handleEndShiftClick}
          className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition"
        >
          End Shift
        </button>
      </div>
    )}
  </div>

  {/* Bill Date */}
  <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-500">
          Bill date
        </p>
        <p className="text-base font-bold text-slate-800 mt-1">
          Select billing date
        </p>
      </div>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="px-4 py-3 border border-slate-200 rounded-xl text-base font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  {/* Cart Items */}
  <div className="flex-1 overflow-y-auto">
    {cart.length === 0 ? (
      <div className="bg-white border border-slate-200 rounded-2xl min-h-[360px] flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <span className="text-4xl">🛒</span>
        </div>

        <h3 className="text-2xl font-extrabold text-slate-700">
          Your cart is empty
        </h3>

        <p className="text-base text-slate-400 mt-2">
          Add products to begin billing
        </p>
      </div>
    ) : (
      cart.map((item) => {
        const { gstAmount, finalPrice } = getPriceWithGST(item);
        const override = priceOverrides[item.cart_key];
        const isEditing = override?.editing;
        const isOverridden =
          item.is_price_overridden && item.original_price;

        return (
          <div
            key={`${item.inventory_id}_${item.selling_price}`}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4"
            style={{
              border: isOverridden
                ? "2px solid #f59e0b"
                : "1px solid #e2e8f0",
            }}
          >
            {/* Product Header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-lg text-slate-900">
                  {item.name}
                </p>

                {isOverridden && (
                  <span
                    className="inline-block mt-1"
                    style={{
                      fontSize: "11px",
                      background: "#fef3c7",
                      color: "#b45309",
                      border: "1px solid #fcd34d",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠ Price Overridden
                  </span>
                )}
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decreaseQty(item)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-xl font-bold text-slate-700 flex items-center justify-center"
                >
                  −
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
                            : i
                        )
                      );
                      return;
                    }

                    const newQty = Math.max(1, Number(val));

                    setCart((prev) =>
                      prev.map((i) =>
                        i.inventory_id === item.inventory_id
                          ? { ...i, qty: newQty }
                          : i
                      )
                    );
                  }}
                  className="w-12 h-10 text-center text-lg font-bold border border-slate-200 rounded-xl bg-white"
                />

                <button
                  onClick={() => increaseQty(item)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-xl font-bold text-slate-700 flex items-center justify-center"
                >
                  +
                </button>

                <button
                  onClick={() => removeItem(item)}
                  className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Product Price */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Unit Price
                </span>

                <div className="flex items-center gap-2">
                  {isOverridden && (
                    <span className="text-sm text-slate-400 line-through">
                      ₹{Number(item.original_price).toFixed(2)}
                    </span>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-2">
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
                          if (e.key === "Enter")
                            confirmPriceOverride(item);

                          if (e.key === "Escape")
                            cancelPriceEdit(item);
                        }}
                        className="w-24 px-2 py-1 border-2 border-orange-400 rounded-lg font-semibold outline-none"
                      />

                      <button
                        onClick={() => confirmPriceOverride(item)}
                        className="px-3 py-1 bg-green-500 text-white rounded-lg font-bold"
                      >
                        ✓
                      </button>

                      <button
                        onClick={() => cancelPriceEdit(item)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`font-bold ${
                        isOverridden
                          ? "text-orange-600"
                          : "text-slate-900"
                      }`}
                    >
                      ₹{Number(item.selling_price).toFixed(2)}

                      <span className="text-xs ml-1 text-slate-400 font-normal">
                        (
                        {Number(item.gst_inclusive) === 1
                          ? "Incl."
                          : "Excl."}{" "}
                        GST)
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-2">
                <span className="text-sm text-slate-500">
                  GST ({item.gst_percent}%)
                </span>

                <span className="text-sm text-slate-600">
                  ₹{(gstAmount * item.qty).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between mt-2">
                <span className="font-semibold text-slate-700">
                  Subtotal
                </span>

                <span className="font-bold text-green-600">
                  ₹{(finalPrice * item.qty).toFixed(2)}
                </span>
              </div>

              {!isEditing && isProductOverrideAllowed(item) && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startPriceEdit(item)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    ✏️ Edit
                  </button>

                  {isOverridden && (
                    <button
                      onClick={() => resetPrice(item)}
                      className="px-3 py-1.5 text-sm border border-orange-200 rounded-lg text-orange-600 hover:bg-orange-50"
                    >
                      ↺ Reset
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })
    )}

    {/* Summary */}
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6 shadow-sm">
      <div className="flex justify-between text-base mb-3">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-semibold text-slate-800">
          ₹{total.toFixed(2)}
        </span>
      </div>

      <div className="flex justify-between text-base pb-4 border-b border-dashed border-slate-200">
        <span className="text-slate-500">GST</span>
        <span className="font-semibold text-slate-800">
          ₹0.00
        </span>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="text-xl font-extrabold text-slate-900">
          Total
        </span>

        <span className="text-2xl font-extrabold text-slate-900">
          ₹{total.toFixed(2)}
        </span>
      </div>

      {/* Checkout */}
      <button
        onClick={() => setShowPayment(true)}
        disabled={cart.length === 0}
        className={`w-full mt-5 py-4 rounded-xl text-lg font-extrabold text-white shadow-sm transition ${
          cart.length === 0
            ? "bg-slate-300 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        Pay ₹{total.toFixed(2)}
      </button>

      {/* Customer Dues */}
      <button
        onClick={() => navigate("/customer-dues")}
        className="w-full mt-3 py-4 rounded-xl text-lg font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
      >
        Customer Dues
      </button>

      {/* Add Advance */}
      <button
        onClick={() => setShowAddAdvance(true)}
        className="w-full mt-3 py-4 rounded-xl text-lg font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
      >
        Add Advance
      </button>
    </div>
  </div>
</div>
    </>
  );
}




