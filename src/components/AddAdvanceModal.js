import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { X, User, Wallet } from "lucide-react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AddAdvanceModal({ onClose, onSuccess }) {
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAdd1, setCustomerAdd1] = useState("");
  const [customerAdd2, setCustomerAdd2] = useState("");
  const [customerArea, setCustomerArea] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [amount, setAmount] = useState(null);
  const [method, setMethod] = useState("cash");
  const [transactionId, setTransactionId] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const parse = (v) => (parseFloat(v) ? parseFloat(v) : 0);
  const amountStyle = { fontSize: "45px", marginBottom: "10px" };
  const quickAmounts = [1000, 2000, 3000, 5000, 10000];

  const keypad = (k) => {
    setAmount((prev) => {
      prev = prev || "";
      if (k === "C") return "";
      if (k === "⌫") return prev.slice(0, -1);
      if (k === ".") return prev.includes(".") ? prev : prev + ".";
      return prev + k;
    });
  };

  useEffect(() => {
    if (customerMobile.length === 10) {
      setLoadingCustomer(true);

      axios
        .get(`${BASE_URL}/api/customers/wallet-balance/${customerMobile}`, {
          headers: getAuthHeader(),
        })
        .then((res) => {
          if (res.data.customer) {
            const c = res.data.customer;
            setCustomerName(c.name || "");
            setCustomerAdd1(c.add1 || "");
            setCustomerAdd2(c.add2 || "");
            setCustomerArea(c.area || "");
            setCustomerCity(c.city || "");
            setCurrentBalance(res.data.balance || 0);
            setIsNewCustomer(false);
          } else {
            setCustomerName("");
            setCustomerAdd1("");
            setCustomerAdd2("");
            setCustomerArea("");
            setCustomerCity("");
            setCurrentBalance(0);
            setIsNewCustomer(true);
          }
        })
        .catch((err) => {
          console.error("Customer fetch error", err);
          setCurrentBalance(0);
          setIsNewCustomer(true);
        })
        .finally(() => {
          setLoadingCustomer(false);
        });
    } else {
      setCustomerName("");
      setCustomerAdd1("");
      setCustomerAdd2("");
      setCustomerArea("");
      setCustomerCity("");
      setCurrentBalance(0);
      setIsNewCustomer(false);
    }
  }, [customerMobile]);

  const handleMobileChange = (e) => {
    let value = e.target.value;
    value = value.replace(/\s+/g, "");
    value = value.replace(/\D/g, "");
    value = value.replace(/^0+/, "");
    value = value.slice(0, 10);

    setCustomerMobile(value);

    if (value.length === 0) {
      setMobileError("Mobile is required");
    } else if (value.length < 10) {
      setMobileError("Enter 10 digit mobile number");
    } else {
      setMobileError("");
    }
  };

  const handleNameChange = (e) => {
    let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setCustomerName(value);

    if (!value) {
      setNameError("Name is required");
    } else {
      setNameError("");
    }
  };

  const isFormValid =
    customerMobile.length === 10 &&
    !mobileError &&
    customerName.trim().length > 0 &&
    !nameError &&
    parse(amount) > 0;

  const handleSubmit = async () => {
    if (!isFormValid) {
      if (!customerName.trim()) {
        setNameError("Name is required");
      }
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/customers/advance`,
        {
          customer: {
            mobile: customerMobile,
            name: customerName,
            add1: customerAdd1,
            add2: customerAdd2,
            area: customerArea,
            city: customerCity,
          },
          amount: parse(amount),
          method,
          transaction_id: method === "online" ? transactionId : null,
        },
        { headers: getAuthHeader() },
      );

      toast.success(
        `₹${parse(amount).toFixed(2)} advance added. New balance: ₹${Number(
          res.data.balance,
        ).toFixed(2)}`,
      );

      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      toast.error(serverMessage || "Failed to add advance");
      console.error("Add Advance Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-2xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Add Customer Advance
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Record an advance payment against the customer's account
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
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT SIDE — CUSTOMER + AMOUNT */}
          <div className="p-7 md:border-r border-slate-200 flex flex-col gap-6">
            {/* Customer Details */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xl font-bold tracking-wide text-slate-500">
                <User size={15} /> CUSTOMER DETAILS
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xl font-bold text-slate-500">
                    MOBILE *
                  </label>
                  <input
                    type="text"
                    className={`mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 rounded-xl ${
                      mobileError ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="10-digit mobile number"
                    value={customerMobile}
                    onChange={handleMobileChange}
                  />
                  {mobileError && (
                    <div className="text-red-600 text-sm font-semibold mt-1">
                      {mobileError}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-2xl font-bold text-slate-500">
                    CUSTOMER NAME *
                  </label>
                  <input
                    type="text"
                    className={`mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 rounded-xl ${
                      nameError ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Full name"
                    value={customerName}
                    onChange={handleNameChange}
                  />
                  {nameError && (
                    <div className="text-red-600 text-sm font-semibold mt-1">
                      {nameError}
                    </div>
                  )}
                </div>
              </div>

              {loadingCustomer && (
                <div className="text-blue-600 text-sm font-semibold">
                  Checking customer...
                </div>
              )}

              {!loadingCustomer && customerMobile.length === 10 && (
                <div
                  className={`p-3 rounded-xl text-base font-extrabold ${
                    isNewCustomer
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {isNewCustomer
                    ? "🆕 New customer — please fill name & details"
                    : `✓ Existing customer — current balance: ₹${Number(currentBalance).toFixed(2)}`}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xl font-bold text-slate-500">
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
                  <label className="text-2xl font-bold text-slate-500">
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
                  <label className="text-2xl font-bold text-slate-500">
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
                  <label className="text-2xl font-bold text-slate-500">
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
            </div>

            <hr className="border-slate-200" />

            {/* Amount */}
            <div className="flex flex-col gap-3">
              <div className="text-2xl font-bold tracking-wide text-slate-500">
                ADVANCE AMOUNT
              </div>

              <input
                type="number"
                className="p-4 text-4xl font-extrabold text-blue-700 text-center border-2 border-slate-200 rounded-xl bg-slate-50 outline-none"
                placeholder="₹0"
                value={amount ?? ""}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? null : e.target.value)
                }
              />

              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(String(qa))}
                    className={`px-5 py-3 rounded-xl border-2 font-extrabold text-lg ${
                      String(amount) === String(qa)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    ₹{qa}
                  </button>
                ))}
              </div>

              <div style={amountStyle} className="text-slate-900">
                Amount: ₹{parse(amount).toFixed(2)}
              </div>

              {!isNewCustomer && customerMobile.length === 10 && (
                <div
                  style={{
                    ...amountStyle,
                    fontSize: "1.35rem",
                    color: "#15803d",
                  }}
                >
                  New Balance: ₹
                  {(Number(currentBalance) + parse(amount)).toFixed(2)}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="flex flex-col gap-3">
              <div className="text-sm font-bold tracking-wide text-slate-500">
                RECEIVED VIA
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod("cash")}
                  className={`p-4 rounded-xl text-center border-2 transition-all ${
                    method === "cash"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xl font-extrabold">Cash</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("online")}
                  className={`p-4 rounded-xl text-center border-2 transition-all ${
                    method === "online"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xl font-extrabold">Online</div>
                </button>
              </div>

              {method === "online" && (
                <input
                  type="text"
                  className="p-3 text-base font-semibold text-slate-900 border-2 border-slate-200 rounded-xl"
                  placeholder="Transaction ID (optional)"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* RIGHT SIDE — KEYPAD */}
          <div className="p-4 bg-slate-50 flex flex-col gap-4 items-center justify-center">
            <div className="grid grid-cols-3 gap-3 w-full">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => keypad(k)}
                    className="py-5 rounded-xl text-3xl font-extrabold text-slate-900 border-2 border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200 shadow-sm"
                  >
                    {k}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => keypad("C")}
                className="col-span-3 py-4 bg-red-600 text-white rounded-xl text-2xl font-extrabold shadow hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY + ACTIONS */}
        <div className="flex justify-end items-center gap-3 px-7 py-5 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-7 py-3.5 rounded-xl text-2xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!isFormValid || submitting}
            onClick={handleSubmit}
            className={`px-7 py-3.5 rounded-xl text-2xl font-bold text-white transition-colors ${
              !isFormValid || submitting
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 cursor-pointer"
            }`}
          >
            {submitting ? "Processing..." : "Add Advance"}
          </button>
        </div>
      </div>
    </div>
  );
}
