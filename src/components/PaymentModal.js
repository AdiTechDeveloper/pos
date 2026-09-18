import { useState, useEffect } from "react";
import axios from "axios";
import {
  ChevronLeft,
  X,
  Lock,
  ChevronDown,
  QrCode,
  Banknote,
  Smartphone,
  SplitSquareHorizontal,
  Clock,
  Wallet,
  Gift,
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const POINT_VALUE = 1; // 1 loyalty point = ₹1 (keep in sync with backend)

export default function PaymentModal({ total, onClose, onConfirm, cart_data }) {
  const [cashGiven, setCashGiven] = useState(null);
  const [paymentType, setPaymentType] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerAdd1, setCustomerAdd1] = useState("");
  const [customerAdd2, setCustomerAdd2] = useState("");
  const [customerArea, setCustomerArea] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerDue, setCustomerDue] = useState(0);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [nameError, setNameError] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState("");

  const parse = (v) => (parseFloat(v) ? parseFloat(v) : 0);

  const maxRedeemablePoints = Math.min(loyaltyBalance, total / POINT_VALUE);
  const pointsApplied = redeemPoints
    ? Math.min(parse(pointsToRedeem), maxRedeemablePoints)
    : 0;
  const pointsDiscount = pointsApplied * POINT_VALUE;

  const netTotal = Math.max(total - pointsDiscount, 0);

  const cashApplied = Math.min(parse(cashGiven), netTotal);
  const remaining = netTotal - cashApplied;
  const balanceReturn = Math.max(parse(cashGiven) - netTotal, 0);
  const amountStyle = {
    fontSize: "1.35rem",
    fontWeight: 700,
    marginBottom: "6px",
  };

  const quickAmounts = [50, 100, 200, 500];

  const paidAmount =
    paymentType === "online" ||
    paymentType === "split" ||
    paymentType === "cash"
      ? netTotal
      : cashApplied;

  const percentPaid =
    netTotal > 0
      ? Math.min(Math.round((parse(cashGiven) / netTotal) * 100), 100)
      : 0;

  const getAuthHeader = () => {
    const user_detail = localStorage.getItem("user_detail");
    const user = user_detail ? JSON.parse(user_detail) : null;
    const token = user?.token;

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (customerMobile.length === 10) {
      setLoadingCustomer(true);

      Promise.allSettled([
        axios.get(`${BASE_URL}/api/customer-due/${customerMobile}`, {
          headers: getAuthHeader(),
        }),
        axios.get(
          `${BASE_URL}/api/customers/wallet-balance/${customerMobile}`,
          {
            headers: getAuthHeader(),
          },
        ),
        axios.get(
          `${BASE_URL}/api/customers/loyalty-balance/${customerMobile}`,
          {
            headers: getAuthHeader(),
          },
        ),
      ])
        .then(([dueResult, walletResult, loyaltyResult]) => {
          if (dueResult.status === "fulfilled") {
            const c = dueResult.value.data.customer;
            if (c) {
              setCustomerName(c.name || "");
              setCustomerAdd1(c.add1 || "");
              setCustomerAdd2(c.add2 || "");
              setCustomerArea(c.area || "");
              setCustomerCity(c.city || "");
              setCustomerDue(dueResult.value.data.total_due || 0);
            } else {
              setCustomerDue(0);
            }
          } else {
            console.error("Customer due fetch error", dueResult.reason);
            setCustomerDue(0);
          }

          if (walletResult.status === "fulfilled") {
            setWalletBalance(walletResult.value.data.balance || 0);
          } else {
            console.error("Wallet balance fetch error", walletResult.reason);
            setWalletBalance(0);
          }

          if (loyaltyResult.status === "fulfilled") {
            setLoyaltyBalance(loyaltyResult.value.data.balance || 0);
          } else {
            console.error("Loyalty balance fetch error", loyaltyResult.reason);
            setLoyaltyBalance(0);
          }
        })
        .finally(() => setLoadingCustomer(false));
    } else {
      setCustomerDue(0);
      setWalletBalance(0);
      setLoyaltyBalance(0);
      setRedeemPoints(false);
      setPointsToRedeem("");
    }
  }, [customerMobile]);

  const keypad = (k) => {
    setCashGiven((prev) => {
      prev = prev || "";
      if (k === "C") return "";
      if (k === "⌫") return prev.slice(0, -1);
      if (k === ".") return prev.includes(".") ? prev : prev + ".";
      return prev + k;
    });
  };

  const handleMethod = (type) => {
    setPaymentType(type);
  };

  const handleConfirm = () => {
    let payments = [];
    let customer = null;

    const apiPaymentType = paymentType;

    if (!customerMobile) {
      alert("Mobile is required for Pay Later");
      return;
    }
    if (!customerName) {
      alert("Name is required");
      return;
    }

    // Mobile validation
    if (customerMobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    // points redemption validation
    if (redeemPoints) {
      const requested = parse(pointsToRedeem);
      if (requested <= 0) {
        alert("Enter a valid number of points to redeem");
        return;
      }
      if (requested > loyaltyBalance) {
        alert(`You only have ${loyaltyBalance} points available`);
        return;
      }
    }

    customer = {
      name: customerName,
      mobile: customerMobile,
      add1: customerAdd1,
      add2: customerAdd2,
      area: customerArea,
      city: customerCity,
    };

    payments = [];

    if (paymentType === "cash") {
      if (!cashGiven || parse(cashGiven) <= 0) {
        alert("Enter cash amount received");
        return;
      }

      const cashAmt = Math.min(parse(cashGiven), netTotal);
      const dueAmt = Math.max(netTotal - cashAmt, 0);

      if (dueAmt > 0 && !customerMobile && !customerName) {
        alert(
          "Mobile number and name  required for partial payment (due amount)",
        );
        return;
      }

      payments.push({
        method: "cash",
        amount: cashAmt,
        cash_received: parse(cashGiven),
        balance_return: Math.max(parse(cashGiven) - netTotal, 0),
      });
    }

    if (paymentType === "online") {
      if (!cashGiven || parse(cashGiven) <= 0) {
        alert("Enter online amount received");
        return;
      }

      const onlineAmt = Math.min(parse(cashGiven), netTotal);
      const dueAmt = Math.max(netTotal - onlineAmt, 0);

      if (dueAmt > 0 && !customerMobile) {
        alert("Mobile number required for partial payment (due amount)");
        return;
      }

      payments.push({
        method: "online",
        amount: onlineAmt,
        transaction_id: "",
      });
    }

    if (paymentType === "split") {
      if (!cashGiven || parse(cashGiven) <= 0) {
        alert("Enter valid cash amount for split payment");
        return;
      }

      const cashAmt = Math.min(parse(cashGiven), netTotal);
      const onlineAmt = netTotal - cashAmt;

      payments.push({
        method: "cash",
        amount: cashAmt,
        cash_received: parse(cashGiven),
        balance_return: Math.max(parse(cashGiven) - cashAmt, 0),
      });

      if (onlineAmt > 0) {
        payments.push({
          method: "online",
          amount: onlineAmt,
          transaction_id: "",
        });
      }
    }

    if (paymentType === "wallet") {
      const walletApplied = Math.min(walletBalance, netTotal);
      const remainingAfterWallet = netTotal - walletApplied;

      payments.push({
        method: "wallet",
        amount: walletApplied,
      });

      if (remainingAfterWallet > 0) {
        if (!cashGiven || parse(cashGiven) < remainingAfterWallet) {
          alert(
            `Wallet covers ₹${walletApplied.toFixed(2)}. Enter remaining ₹${remainingAfterWallet.toFixed(2)} in cash.`,
          );
          return;
        }
        payments.push({
          method: "cash",
          amount: remainingAfterWallet,
          cash_received: parse(cashGiven),
          balance_return: Math.max(parse(cashGiven) - remainingAfterWallet, 0),
        });
      }
    }

    onConfirm({
      payments,
      payment_type: apiPaymentType,
      customer,
      points_redeemed: pointsApplied,
    });
  };

  const isConfirmDisabled =
    ((remaining > 0 || paymentType === "credit") &&
      customerMobile.length !== 10) ||
    !!mobileError ||
    ((paymentType === "cash" || paymentType === "online") &&
      (!cashGiven || parse(cashGiven) <= 0)) ||
    (paymentType === "split" && cashApplied <= 0) ||
    (paymentType === "wallet" &&
      walletBalance < netTotal &&
      (!cashGiven || parse(cashGiven) < netTotal - walletBalance)) ||
    (redeemPoints &&
      (parse(pointsToRedeem) <= 0 || parse(pointsToRedeem) > loyaltyBalance));

  const paymentMethods = [
    { key: "cash", label: "Cash", sub: "Collect at counter", icon: Banknote },
    {
      key: "online",
      label: "Online",
      sub: "UPI, card or wallet",
      icon: Smartphone,
    },
    {
      key: "split",
      label: "Split payment",
      sub: "Use two methods",
      icon: SplitSquareHorizontal,
    },
    {
      key: "credit",
      label: "Pay later",
      sub: "Create customer credit",
      icon: Clock,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
        {/* HEADER */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Complete payment
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                Review the amount and choose a payment method
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* LEFT SIDE – METHOD LIST */}
          <div className="p-4 sm:p-6 md:p-7 md:border-r border-slate-200">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-4 sm:px-6 md:px-7 py-4 sm:py-5 border-b">
                <div>
                  <div className="text-xl sm:text-2xl font-bold tracking-wide text-slate-500">
                    PAYMENT METHOD
                  </div>
                  <div className="text-xl text-slate-700  mt-1">
                    How would the customer like to pay?
                  </div>
                </div>
                <Lock size={18} className="text-slate-400 mt-5" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(({ key, label, sub, icon: Icon }) => {
                  const selected = paymentType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleMethod(key)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="white"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="font-bold text-slate-900 text-xl sm:text-2xl">
                        {label}
                      </div>
                      <div className="text-xl text-slate-500 font-medium mt-0.5">
                        {sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              {walletBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleMethod("wallet")}
                  className={`text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-xl ${
                    paymentType === "wallet"
                      ? "border-purple-600 bg-purple-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      paymentType === "wallet"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-600 "
                    }`}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base">
                      Wallet
                    </div>
                    <div className="text-xl sm:text-2xl text-slate-500 font-medium mt-0.5">
                      Available: ₹{Number(walletBalance).toFixed(2)}
                    </div>
                  </div>
                </button>
              )}

              {/* Loyalty Points redemption */}
              {loyaltyBalance > 0 && (
                <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500 text-white">
                        <Gift size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">
                          Loyalty Points
                        </div>
                        <div className="text-lg text-slate-500 font-medium mt-0.5">
                          Available: {loyaltyBalance} pts (₹
                          {(loyaltyBalance * POINT_VALUE).toFixed(2)})
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={redeemPoints}
                        onChange={(e) => {
                          setRedeemPoints(e.target.checked);
                          if (!e.target.checked) setPointsToRedeem("");
                        }}
                        className="w-5 h-5"
                      />
                      <span className="text-lg font-bold text-slate-700">
                        Redeem
                      </span>
                    </label>
                  </div>

                  {redeemPoints && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={maxRedeemablePoints}
                        className="flex-1 p-2.5 text-xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl"
                        placeholder="Points to redeem"
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPointsToRedeem(String(maxRedeemablePoints))
                        }
                        className="px-4 py-2.5 rounded-xl text-lg font-bold bg-amber-500 text-white hover:bg-amber-600"
                      >
                        Max
                      </button>
                    </div>
                  )}

                  {pointsApplied > 0 && (
                    <div className="mt-2 text-lg font-extrabold text-emerald-700">
                      Discount applied: -₹{pointsDiscount.toFixed(2)} (
                      {pointsApplied} pts)
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-slate-200" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold tracking-wide text-slate-500">
                    CUSTOMER DETAILS
                  </div>
                  <div className="text-xl text-slate-700 font-medium mt-1">
                    Mobile is required for due/pay-later billing
                  </div>
                </div>
                <ChevronDown size={16} className="text-slate-400 mt-5" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xl font-bold text-slate-500">
                    MOBILE NUMBER
                  </label>
                  <input
                    type="text"
                    className={`mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 rounded-xl ${
                      mobileError ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="+91 98765 43210"
                    value={customerMobile}
                    onChange={(e) => {
                      let value = e.target.value;

                      // remove spaces
                      value = value.replace(/\s+/g, "");
                      // remove non digits
                      value = value.replace(/\D/g, "");
                      // remove leading 0
                      value = value.replace(/^0+/, "");
                      // limit to 10
                      value = value.slice(0, 10);

                      setCustomerMobile(value);

                      if (value.length === 0) {
                        setMobileError("Mobile is required");
                      } else if (value.length < 10) {
                        setMobileError("Enter 10 digit mobile number");
                      } else {
                        setMobileError("");
                      }
                    }}
                  />
                  {mobileError && (
                    <div className="text-red-600 text-sm font-semibold mt-1">
                      {mobileError}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xl font-bold text-slate-500">
                    CUSTOMER NAME
                  </label>
                  <input
                    type="text"
                    className={`mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 rounded-xl ${
                      nameError ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Enter full name"
                    value={customerName}
                    onChange={(e) => {
                      let value = e.target.value;

                      // Allow only letters + space
                      value = value.replace(/[^a-zA-Z\s]/g, "");

                      setCustomerName(value);

                      // Clear the error as soon as they type valid characters
                      if (value.trim() !== "") {
                        setNameError("");
                      }
                    }}
                    onBlur={() => {
                      // Trigger "required" error if they leave it empty
                      if (!customerName.trim()) {
                        setNameError("Name is required");
                      }
                    }}
                  />
                  {nameError && (
                    <div className="text-red-600 text-sm font-semibold mt-1">
                      {nameError}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xl font-bold text-slate-500">
                    ADDRESS LINE 1
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl"
                    placeholder="House / street"
                    value={customerAdd1}
                    onChange={(e) => setCustomerAdd1(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xl font-bold text-slate-500">
                    ADDRESS LINE 2
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl"
                    placeholder="Landmark (optional)"
                    value={customerAdd2}
                    onChange={(e) => setCustomerAdd2(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xl font-bold text-slate-500">
                    AREA
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl"
                    placeholder="Area"
                    value={customerArea}
                    onChange={(e) => setCustomerArea(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xl font-bold text-slate-500">
                    CITY
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl"
                    placeholder="City"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                  />
                </div>
              </div>

              {loadingCustomer && (
                <div className="text-blue-600 text-sm font-semibold">
                  Checking customer...
                </div>
              )}

              {customerDue > 0 && (
                <div className="bg-red-100 text-red-700 p-3 rounded-xl font-extrabold text-base">
                  Pending Due: ₹{customerDue}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE – AMOUNT + KEYPAD */}
          <div className="p-7 bg-slate-50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold tracking-wide text-slate-500">
                  AMOUNT TO COLLECT
                </div>
                {pointsDiscount > 0 && (
                  <div className="text-lg text-slate-400 line-through font-semibold mt-1">
                    ₹{total.toFixed(2)}
                  </div>
                )}
                <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 mt-1">
                  ₹{netTotal.toFixed(2)}
                </div>
                {pointsDiscount > 0 && (
                  <div className="text-sm text-emerald-600 font-bold mt-1">
                    {pointsApplied} pts redeemed (-₹{pointsDiscount.toFixed(2)})
                  </div>
                )}
              </div>
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeDasharray={`${percentPaid * 0.974} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-blue-700">
                  {percentPaid}%
                </span>
              </div>
            </div>

            {(paymentType === "cash" ||
              paymentType === "split" ||
              paymentType === "online" ||
              (paymentType === "wallet" && walletBalance < netTotal)) && (
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between text-lg text-slate-500 font-bold">
                  <span>
                    {paymentType === "wallet"
                      ? "Remaining amount (cash)"
                      : paymentType === "online"
                        ? "Online amount received"
                        : "Cash received"}
                  </span>
                  <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                    Balance remaining
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl sm:text-2xl text-slate-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    className="text-3xl sm:text-5xl font-extrabold text-blue-700 outline-none w-full bg-transparent"
                    placeholder="0.00"
                    value={cashGiven ?? ""}
                    onChange={(e) =>
                      setCashGiven(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                  <span className="text-sm text-slate-400 font-bold">INR</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${percentPaid}%` }}
                  />
                </div>
              </div>
            )}

            <div style={amountStyle} className="text-slate-900">
              Paid: ₹{paidAmount.toFixed(2)}
            </div>

            {paymentType === "split" && (
              <>
                <div style={amountStyle} className="text-slate-900">
                  Cash: ₹{cashApplied.toFixed(2)}
                </div>
                <div style={amountStyle} className="text-slate-900">
                  Online: ₹{(netTotal - cashApplied).toFixed(2)}
                </div>
              </>
            )}

            {paymentType === "wallet" && (
              <>
                <div style={amountStyle} className="text-slate-900">
                  From Wallet: ₹{Math.min(walletBalance, netTotal).toFixed(2)}
                </div>
                {netTotal > walletBalance && (
                  <div style={{ ...amountStyle, color: "#dc2626" }}>
                    Remaining (Cash needed): ₹
                    {(netTotal - walletBalance).toFixed(2)}
                  </div>
                )}
              </>
            )}

            {paymentType === "cash" && balanceReturn > 0 && (
              <div style={amountStyle} className="text-slate-900">
                Change: ₹{balanceReturn.toFixed(2)}
              </div>
            )}

            {(paymentType === "cash" || paymentType === "online") &&
              remaining > 0 && (
                <div style={{ ...amountStyle, color: "#dc2626" }}>
                  Due (Pay Later): ₹{remaining.toFixed(2)}
                </div>
              )}

            {(["cash", "split", "online"].includes(paymentType) ||
              (paymentType === "wallet" && walletBalance < netTotal)) && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashGiven(String(amt))}
                      className={`p-3 rounded-xl text-xl font-extrabold border-2 ${
                        Number(cashGiven) === amt
                          ? "border-blue-600 text-blue-700 bg-blue-50"
                          : "border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    ".",
                    "0",
                    "⌫",
                  ].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => keypad(k)}
                      className="py-4 rounded-xl text-3xl font-extrabold text-slate-900 border-2 border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => keypad("C")}
                  className="p-3 rounded-xl text-xl sm:text-2xl font-extrabold text-slate-700 bg-slate-200 hover:bg-slate-300"
                >
                  CLEAR AMOUNT
                </button>
              </>
            )}

            {(paymentType === "cash" || paymentType === "online") && (
              <div className="flex items-center justify-between bg-red-100 text-red-800 rounded-xl px-4 py-3 text-xl font-extrabold">
                <span>Still due</span>
                <span>₹{remaining.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY + ACTION BUTTONS */}
        <div className="flex justify-between items-center px-7 py-5 border-t border-slate-200">
          <div></div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-7 py-3.5 rounded-xl text-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isConfirmDisabled}
              onClick={handleConfirm}
              className={`px-7 py-3.5 rounded-xl text-xl font-bold text-white flex items-center gap-2 transition-colors ${
                isConfirmDisabled
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              }`}
            >
              <QrCode size={18} />
              Confirm payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
