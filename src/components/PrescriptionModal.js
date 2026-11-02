import { useState } from "react";
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
    doctor_name: "",
    doctor_reg_no: "",
    prescription_no: "",
    prescription_date: "",
    ...(initial || {}),
    patient_age: initial?.patient_age ?? "",
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const submit = () => {
    const e = {};
    if (!f.patient_name.trim()) e.patient_name = "Patient name is required";
    if (!f.doctor_name.trim()) e.doctor_name = "Doctor name is required";
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
      doctor_name: f.doctor_name.trim(),
      doctor_reg_no: f.doctor_reg_no.trim() || null,
      prescription_no: f.prescription_no.trim() || null,
      prescription_date: f.prescription_date || null,
    });
  };

  const field = (
    key,
    label,
    { required = false, type = "text", placeholder = "" } = {},
  ) => (
    <div>
      <label className="text-lg font-bold text-slate-500">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type={type}
        className={`mt-1 w-full p-3 text-xl font-semibold text-slate-900 border-2 rounded-xl ${
          errors[key] ? "border-red-500" : "border-slate-200"
        }`}
        placeholder={placeholder}
        value={f[key]}
        onChange={(e) => set(key, e.target.value)}
      />
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
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
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
              placeholder: "Full name",
            })}
            {field("patient_age", "AGE", {
              type: "number",
              placeholder: "Years",
            })}
          </div>

          {field("patient_address", "PATIENT ADDRESS", {
            required: strict,
            placeholder: "House / street / area",
          })}

          <div className="grid grid-cols-2 gap-3">
            {field("doctor_name", "DOCTOR NAME", {
              required: true,
              placeholder: "Dr. ...",
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
