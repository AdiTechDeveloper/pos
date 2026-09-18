import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";

const PaymentEditModal = ({ bill, onClose, onSuccess }) => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [payments, setPayments] = useState([]);

  const totalEntered = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const handleChange = (index, field, value) => {
    const updated = [...payments];
    updated[index][field] = value;
    setPayments(updated);
  };

  const addRow = () => {
    setPayments([...payments, { method: "cash", amount: 0 }]);
  };

  const removeRow = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (totalEntered !== Number(bill.total_amount)) {
      alert("Total must match bill amount!");
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/sales-bills/${bill.id}/change-payment`,
        { payments },
        {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(localStorage.getItem("user_detail"))?.token
            }`,
          },
        },
      );

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error updating payment");
    }
  };

  useEffect(() => {
    if (bill?.payments?.length > 0) {
      const formatted = bill.payments
        .filter((p) => p.status === "success")
        .map((p) => ({
          method: p.method,
          amount: p.amount,
        }));

      setPayments(formatted);
    } else {
      setPayments([{ method: "cash", amount: bill.total_amount }]);
    }
  }, [bill]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-2xl font-semibold">Edit Payment</h2>
          <button onClick={onClose} className="text-gray-500 text-lg">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Bill Info */}
          <div className="mb-5 space-y-3">
            <div className="flex">
              <p className="text-2xl font-bold text-gray-500 mr-2">Bill No:</p>
              <p className="text-2xl font-medium text-gray-800">
                {bill.bill_no}
              </p>
            </div>

            <div className="flex">
              <p className="text-2xl font-bold text-gray-500 mr-2">
                Total Amount:
              </p>
              <p className="text-2xl font-bold text-green-600">
                ₹{bill.total_amount}
              </p>
            </div>
          </div>

          {/* Payment Rows */}
          <div className="space-y-3">
            {payments.map((p, index) => (
              <div key={index} className="flex items-center gap-2 w-full">
                {/* Select Box */}
                <select
                  value={p.method}
                  onChange={(e) =>
                    handleChange(index, "method", e.target.value)
                  }
                  className="w-1/2 px-3 py-2 border rounded-md text-gray-700 outline-none focus:border-gray-400"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="wallet">Wallet</option>
                </select>

                {/* Input Box */}
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    handleChange(index, "amount", e.target.value)
                  }
                  className="w-1/2 px-3 py-2 border rounded-md text-gray-700 outline-none focus:border-gray-400"
                  placeholder="0"
                />

                {/* Cross / Remove Button */}
                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-red-500 hover:text-red-700 px-1 text-lg font-bold shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Split */}
          <button
            onClick={addRow}
            className="mt-6 text-blue-600 font-semibold text-2xl hover:text-blue-700 transition"
          >
            + Add Split Payment
          </button>

          {/* Total */}
          <div className="mt-5 flex items-center text-lg font-semibold">
            <span className="text-2xl mr-2">Total Entered:</span>
            <span
              className={
                totalEntered === Number(bill.total_amount)
                  ? "text-green-600 text-2xl"
                  : "text-red-500 text-2xl"
              }
            >
              ₹{totalEntered}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-lg text-gray-600 text-2xl"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-2xl hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentEditModal;
