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
  const [onlineGiven, setOnlineGiven] = useState(""); 
  const [activeField, setActiveField] = useState("cash");
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

  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);

  const parse = (v) => (parseFloat(v) ? parseFloat(v) : 0);

  const maxRedeemablePoints = Math.min(loyaltyBalance, total / POINT_VALUE);
  const pointsApplied = redeemPoints
    ? Math.min(parse(pointsToRedeem), maxRedeemablePoints)
    : 0;
  const pointsDiscount = pointsApplied * POINT_VALUE;

  const netTotal = Math.max(total - pointsDiscount, 0);

  const isSplit = paymentType === "split";

  // ---------- NEW: SPLIT PAYMENT CALCULATION ----------
  // Example: bill 129, online 29, cash 500
  //   splitOnline      = 29   (online se aaya, bill se zyada nahi ho sakta)
  //   splitCashDue     = 100  (bill ka bacha hua hissa jo cash mein chahiye)
  //   splitCashApplied = 100  (cash drawer mein actually rakha jaane wala)
  //   splitChange      = 400  (customer ko wapas)
  const splitOnline = Math.min(parse(onlineGiven), netTotal);
  const splitCashDue = Math.max(netTotal - splitOnline, 0);
  const splitCashApplied = Math.min(parse(cashGiven), splitCashDue);
  const splitChange = Math.max(parse(cashGiven) - splitCashDue, 0);
  const splitRemaining = Math.max(splitCashDue - splitCashApplied, 0);
  // -----------------------------------------------------

  const cashApplied = Math.min(parse(cashGiven), netTotal);
  const remaining = isSplit ? splitRemaining : netTotal - cashApplied;
  const balanceReturn = isSplit
    ? splitChange
    : Math.max(parse(cashGiven) - netTotal, 0);

  const amountStyle = {
    fontSize: "1.35rem",
    fontWeight: 700,
    marginBottom: "6px",
  };

  const quickAmounts = [50, 100, 200, 500];

  const paidAmount = isSplit
    ? splitOnline + splitCashApplied
    : paymentType === "online" || paymentType === "cash"
      ? netTotal
      : cashApplied;

  const percentPaid =
    netTotal > 0
      ? isSplit
        ? Math.min(
            Math.round(((splitOnline + splitCashApplied) / netTotal) * 100),
            100,
          )
        : Math.min(Math.round((parse(cashGiven) / netTotal) * 100), 100)
      : 0;

  const getAuthHeader = () => {
    const user_detail = localStorage.getItem("user_detail");
    const user = user_detail ? JSON.parse(user_detail) : null;
    const token = user?.token;

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

 
  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/customers`, { headers: getAuthHeader() })
      .then((res) => {
        const payload = res.data;
        let list = payload?.data ?? payload?.customers ?? payload;

      
        if (list && !Array.isArray(list) && Array.isArray(list.data)) {
          list = list.data;
        }

        setAllCustomers(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error("Customer list fetch error", err);
        setAllCustomers([]);
      });
  }, []);

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

  useEffect(() => {
    if (paymentType === "online") {
      setCashGiven(Number(netTotal.toFixed(2)));
    }
  }, [paymentType, netTotal]);

  const searchCustomersByName = (value) => {
    const q = value.trim().toLowerCase();

    if (q.length < 2) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const matches = allCustomers
      .filter((c) => (c.name || "").toLowerCase().includes(q))
      .sort((a, b) => {
        
        const aStarts = (a.name || "").toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = (b.name || "").toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts;
      })
      .slice(0, 8);

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectCustomer = (c) => {
    const mobile = String(c.mobile || "")
      .replace(/\s+/g, "")
      .replace(/\D/g, "")
      .replace(/^0+/, "")
      .slice(0, 10);

    setCustomerName(c.name || "");
    setCustomerAdd1(c.add1 || "");
    setCustomerAdd2(c.add2 || "");
    setCustomerArea(c.area || "");
    setCustomerCity(c.city || "");

    setCustomerMobile(mobile);
    setMobileError(mobile.length === 10 ? "" : "Enter 10 digit mobile number");
    setNameError("");

    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const activeValue = isSplit && activeField === "online" ? onlineGiven : cashGiven;

  const setActiveValue = (next) => {
    if (isSplit && activeField === "online") {
      if (parse(next) > netTotal) {
        setOnlineGiven(String(netTotal));
      } else {
        setOnlineGiven(next);
      }
    } else {
      setCashGiven(next);
    }
  };

  const keypad = (k) => {
   
    const prev = String(activeValue ?? "");

    if (k === "C") return setActiveValue("");
    if (k === "⌫") return setActiveValue(prev.slice(0, -1));
    if (k === ".") return setActiveValue(prev.includes(".") ? prev : prev + ".");
    return setActiveValue(prev + k);
  };

  const handleMethod = (type) => {
    if (paymentType === "online" && type !== "online") {
      setCashGiven(null);
    }

    if (type === "split") {
      setCashGiven(null);
      setOnlineGiven("");
      setActiveField("cash");
    } else {
      setOnlineGiven("");
    }

    setPaymentType(type);
  };

  const handleConfirm = () => {
    let payments = [];
    let customer = null;

    const apiPaymentType = paymentType;

    if (!customerMobile) {
      alert("Mobile Number  is required");
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

    // ---------- NEW: SPLIT (cash + online alag inputs) ----------
    if (paymentType === "split") {
      if (parse(onlineGiven) > netTotal) {
        alert("Online amount cannot be more than the bill amount");
        return;
      }

      if (splitOnline <= 0 && parse(cashGiven) <= 0) {
        alert("Enter cash and/or online amount for split payment");
        return;
      }

      if (splitCashApplied > 0) {
        payments.push({
          method: "cash",
          amount: splitCashApplied,
          cash_received: parse(cashGiven),
          balance_return: splitChange,
        });
      }

      if (splitOnline > 0) {
        payments.push({
          method: "online",
          amount: splitOnline,
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
    (paymentType === "split" && splitOnline + splitCashApplied <= 0) ||
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

                {/* relative wrapper + suggestion dropdown */}
                <div className="relative">
                  <label className="text-xl font-bold text-slate-500">
                    CUSTOMER NAME
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
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

                      // matching customers dikhao
                      searchCustomersByName(value);
                    }}
                    onFocus={() => searchCustomersByName(customerName)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowSuggestions(false);
                    }}
                    onBlur={() => {
                      setShowSuggestions(false);

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

                  {/* suggestions list */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <ul className="absolute left-0 top-full mt-1 z-30 min-w-full w-[22rem] max-w-[90vw] max-h-72 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-xl">
                      {filteredSuggestions.map((c) => (
                        <li
                          key={c.id}
                          // onMouseDown + preventDefault: input blur hone se pehle select ho jaye
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(c);
                          }}
                          className="px-4 py-3 cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-blue-50"
                        >
                          <div className="text-lg font-bold text-slate-900">
                            {c.name}
                          </div>
                          <div className="text-base font-medium text-slate-500">
                            {c.mobile}
                            {(c.area || c.city) &&
                              ` • ${[c.area, c.city]
                                .filter(Boolean)
                                .join(", ")}`}
                          </div>
                        </li>
                      ))}
                    </ul>
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
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5">
                {/* ---------- NEW: SPLIT = DO ALAG INPUTS ---------- */}
                {isSplit ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* ONLINE */}
                    <div
                      onClick={() => setActiveField("online")}
                      className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${
                        activeField === "online"
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-500">
                        ONLINE RECEIVED
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl text-slate-500 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={netTotal}
                          className="text-3xl font-extrabold text-blue-700 outline-none w-full bg-transparent"
                          placeholder="0.00"
                          value={onlineGiven}
                          onFocus={() => setActiveField("online")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") return setOnlineGiven("");
                            // bill se zyada online nahi
                            setOnlineGiven(
                              Number(raw) > netTotal ? String(netTotal) : raw,
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* CASH */}
                    <div
                      onClick={() => setActiveField("cash")}
                      className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${
                        activeField === "cash"
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-500">
                        CASH RECEIVED
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl text-slate-500 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="text-3xl font-extrabold text-blue-700 outline-none w-full bg-transparent"
                          placeholder="0.00"
                          value={cashGiven ?? ""}
                          onFocus={() => setActiveField("cash")}
                          onChange={(e) => {
                            const val =
                              e.target.value === ""
                                ? null
                                : Number(e.target.value);
                            setCashGiven(val);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-500">
                      <span>
                        {paymentType === "online"
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
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          setCashGiven(val);
                        }}
                        readOnly={paymentType === "online"}
                      />
                      <span className="text-sm text-slate-400 font-bold">
                        INR
                      </span>
                    </div>
                  </>
                )}

                <div style={amountStyle} className="text-slate-900 mt-3">
                  Paid: ₹{paidAmount.toFixed(2)}
                </div>

                {isSplit && (
                  <>
                    <div style={amountStyle} className="text-slate-900">
                      Online Applied: ₹{splitOnline.toFixed(2)}
                    </div>
                    <div style={amountStyle} className="text-slate-900">
                      Cash Needed: ₹{splitCashDue.toFixed(2)}
                    </div>
                    <div style={amountStyle} className="text-slate-900">
                      Cash Applied: ₹{splitCashApplied.toFixed(2)}
                    </div>
                    {splitChange > 0 && (
                      <div style={{ ...amountStyle, color: "#16a34a" }}>
                        Change to Return: ₹{splitChange.toFixed(2)}
                      </div>
                    )}
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

                {(paymentType === "cash" ||
                  paymentType === "online" ||
                  isSplit) &&
                  remaining > 0 && (
                    <div style={{ ...amountStyle, color: "#dc2626" }}>
                      Due (Pay Later): ₹{remaining.toFixed(2)}
                    </div>
                  )}

                {(["cash", "split"].includes(paymentType) ||
                  (paymentType === "wallet" && walletBalance < netTotal)) && (
                  <>
                    {isSplit && (
                      <div className="text-sm font-bold text-slate-500 mb-2">
                        Keypad editing:{" "}
                        <span className="text-blue-700">
                          {activeField === "online" ? "ONLINE" : "CASH"}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setActiveValue(String(amt))}
                          className={`p-3 rounded-xl text-xl font-extrabold border-2 ${
                            Number(activeValue) === amt
                              ? "border-blue-600 text-blue-700 bg-blue-50"
                              : "border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
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
                      className="mt-2 p-3 rounded-xl text-xl sm:text-2xl font-extrabold text-slate-700 bg-slate-200 hover:bg-slate-300"
                    >
                      CLEAR AMOUNT
                    </button>
                  </>
                )}

                {(paymentType === "cash" ||
                  paymentType === "online" ||
                  isSplit) && (
                  <div className="flex items-center justify-between bg-red-100 text-red-800 rounded-xl px-4 py-3 text-xl font-extrabold mt-3">
                    <span>Still due</span>
                    <span>₹{remaining.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

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
      </div>
    </div>
  );
}