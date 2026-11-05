import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

export default function PrescriptionModal({
  items,
  initial,
  onClose,
  onConfirm,
}) {
  const strict = items.some((i) => ["H1", "X"].includes(i.drug_schedule));

  const [f, setF] = useState({
    patient_name: "",
    patient_age: "",
    patient_address: "",
    customer_mobile: "",
    doctor_name: "",
    doctor_reg_no: "",
    prescription_no: "",
    prescription_date: "",
    ...(initial || {}),
    patient_age: initial?.patient_age ?? "",
  });
  const [errors, setErrors] = useState({});

  // Autocomplete: suggestions for patient / doctor name from earlier prescriptions
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [suggest, setSuggest] = useState({ field: null, items: [] });
  const timerRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const authHeaders = () => {
    try {
      const raw = localStorage.getItem("user_detail");
      const token = raw ? JSON.parse(raw)?.token : null;
      return token
        ? { Accept: "application/json", Authorization: `Bearer ${token}` }
        : { Accept: "application/json" };
    } catch (e) {
      return { Accept: "application/json" };
    }
  };

  const closeSuggestions = () => {
    clearTimeout(timerRef.current);
    reqIdRef.current += 1; // ignore any response still in flight
    setSuggest({ field: null, items: [] });
  };

  const requestSuggestions = (key, type, value) => {
    clearTimeout(timerRef.current);

    const q = value.trim();
    if (q.length < 2) {
      closeSuggestions();
      return;
    }

    timerRef.current = setTimeout(async () => {
      const id = ++reqIdRef.current;

      try {
        const res = await axios.get(
          `${BASE_URL}/api/prescriptions/suggestions`,
          {
            headers: authHeaders(),
            params: { type, q },
          },
        );

        if (id !== reqIdRef.current) return;
        setSuggest({ field: key, items: res.data?.data || [] });
      } catch (err) {
        if (id === reqIdRef.current) setSuggest({ field: null, items: [] });
      }
    }, 300);
  };

  const pickSuggestion = (key, item) => {
    if (key === "patient_name") {
      setF((p) => ({
        ...p,
        patient_name: item.patient_name,
        patient_age:
          item.patient_age !== null && item.patient_age !== undefined
            ? String(item.patient_age)
            : p.patient_age,
        patient_address: item.patient_address || p.patient_address,
      }));
      setErrors((p) => ({
        ...p,
        patient_name: "",
        patient_age: "",
        patient_address: "",
      }));
    } else {
      setF((p) => ({
        ...p,
        doctor_name: item.doctor_name,
        doctor_reg_no: item.doctor_reg_no || p.doctor_reg_no,
      }));
      setErrors((p) => ({ ...p, doctor_name: "", doctor_reg_no: "" }));
    }

    closeSuggestions();
  };

  const set = (k, v) => {
    // Mobile: digits only, no leading zero, max 10 (same rule as the payment screen)
    if (k === "customer_mobile") {
      v = String(v).replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
    }
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const submit = () => {
    const e = {};
    if (!f.patient_name.trim()) e.patient_name = "Patient name is required";
    if (!f.doctor_name.trim()) e.doctor_name = "Doctor name is required";
    if (!/^\d{10}$/.test(f.customer_mobile))
      e.customer_mobile = "Enter a 10 digit mobile number";
    if (strict && !f.patient_address.trim())
      e.patient_address = "Address is required for Schedule H1/X";
    if (strict && !f.doctor_reg_no.trim())
      e.doctor_reg_no = "Doctor reg. no. is required for Schedule H1/X";
    if (
      f.patient_age !== "" &&
      (isNaN(f.patient_age) ||
        Number(f.patient_age) < 0 ||
        Number(f.patient_age) > 130)
    )
      e.patient_age = "Enter a valid age";

    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    onConfirm({
      patient_name: f.patient_name.trim(),
      patient_age: f.patient_age === "" ? null : Number(f.patient_age),
      patient_address: f.patient_address.trim() || null,
      // Not saved in the register: only carried to the payment screen as the bill customer
      customer_mobile: f.customer_mobile,
      doctor_name: f.doctor_name.trim(),
      doctor_reg_no: f.doctor_reg_no.trim() || null,
      prescription_no: f.prescription_no.trim() || null,
      prescription_date: f.prescription_date || null,
    });
  };

  const field = (
    key,
    label,
    {
      required = false,
      type = "text",
      placeholder = "",
      suggestType = null,
    } = {},
  ) => (
    <div className="relative">
      <label className="text-lg font-bold text-slate-500">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type={type}
        autoComplete="off"
        className={`mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 rounded-xl ${
          errors[key] ? "border-red-500" : "border-slate-200"
        }`}
        placeholder={placeholder}
        value={f[key]}
        onChange={(e) => {
          set(key, e.target.value);
          if (suggestType) requestSuggestions(key, suggestType, e.target.value);
        }}
        onBlur={suggestType ? closeSuggestions : undefined}
        onKeyDown={(e) => {
          if (suggestType && e.key === "Escape") closeSuggestions();
        }}
      />

      {suggestType && suggest.field === key && suggest.items.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          {suggest.items.map((item, idx) => (
            <div
              key={`${key}_${idx}`}
              // mouse-down is cancelled so the input keeps focus until the click lands
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickSuggestion(key, item)}
              className="touch-manipulation min-h-[60px] px-4 py-3 cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-blue-50 active:bg-blue-100"
            >
              {suggestType === "patient" ? (
                <>
                  <div className="text-xl font-bold text-slate-900">
                    {item.patient_name}
                  </div>
                  <div className="text-base text-slate-500">
                    {[
                      item.patient_age ? `Age ${item.patient_age}` : null,
                      item.patient_address,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No other details saved"}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold text-slate-900">
                    {item.doctor_name}
                  </div>
                  <div className="text-base text-slate-500">
                    {item.doctor_reg_no
                      ? `Reg. no. ${item.doctor_reg_no}`
                      : "No registration no. saved"}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {errors[key] && (
        <div className="text-red-600 text-sm font-semibold mt-1">
          {errors[key]}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Prescription details
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              Required for the medicines below
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation flex items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200"
          >
            <X size={26} />
          </button>
        </div>

        <div className="px-7 py-5 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {items.map((i) => (
              <span
                key={i.cart_key}
                className="px-3 py-1 rounded-full text-base font-bold bg-red-50 text-red-700 border border-red-200"
              >
                {i.name}
                {i.drug_schedule && i.drug_schedule !== "none"
                  ? ` · ${i.drug_schedule}`
                  : " · Rx"}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("patient_name", "PATIENT NAME", {
              required: true,
              placeholder: "Type 2+ letters to search",
              suggestType: "patient",
            })}
            {field("patient_age", "AGE", {
              type: "number",
              placeholder: "Years",
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("customer_mobile", "MOBILE NO.", {
              required: true,
              type: "tel",
              placeholder: "10 digit mobile number",
            })}
            <p className="self-end pb-3 text-base font-medium text-slate-500">
              Also used as the customer on the bill, so it is not asked again at
              payment.
            </p>
          </div>

          {field("patient_address", "PATIENT ADDRESS", {
            required: strict,
            placeholder: "House / street / area",
          })}

          <div className="grid grid-cols-2 gap-3">
            {field("doctor_name", "DOCTOR NAME", {
              required: true,
              placeholder: "Dr. ... (type 2+ letters to search)",
              suggestType: "doctor",
            })}
            {field("doctor_reg_no", "DOCTOR REG. NO.", {
              required: strict,
              placeholder: "Medical council reg. no.",
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("prescription_no", "PRESCRIPTION NO.", {
              placeholder: "Optional",
            })}
            {field("prescription_date", "PRESCRIPTION DATE", { type: "date" })}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-7 py-5 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-7 py-3.5 rounded-xl text-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="px-7 py-3.5 rounded-xl text-xl font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            Save & continue to payment
          </button>
        </div>
      </div>
    </div>
  );
}
