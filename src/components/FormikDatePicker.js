
import React, { useMemo } from "react";
import { useField, useFormikContext } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const FormikDatePicker = ({
  name,
  placeholder = "dd-mm-yyyy",
  className = "form-control",
  ...props
}) => {
  const [field] = useField(name);
  const { setFieldValue, setFieldTouched } = useFormikContext();

  // Parse YYYY-MM-DD safely. Invalid/incomplete values return null.
  const getValueAsDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== "string") return null;

    const trimmed = value.trim();

    // Formik value format: YYYY-MM-DD
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const date = new Date(year, month - 1, day);

      // Reject invalid calendar dates (e.g. 2025-02-31)
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }

      return date;
    }

    return null;
  };

  const selectedDate = useMemo(
    () => getValueAsDate(field.value),
    [field.value]
  );

  const formatDateToYYYYMMDD = (date) => {
    if (!date || Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return (
    <DatePicker
      name={name}
      className={className}
      wrapperClassName="w-100 d-block"
      selected={selectedDate}
      onChange={(date) => {
        setFieldValue(name, formatDateToYYYYMMDD(date));
      }}
      onChangeRaw={(event) => {
        const input = event?.target;
        if (!input) return;

        // Allow only digits and hyphen
        let value = input.value.replace(/[^\d-]/g, "");

        // Format as DD-MM-YYYY and limit digits
        const digits = value.replace(/\D/g, "").slice(0, 8);

        let formatted = digits;

        if (digits.length > 4) {
          formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
        } else if (digits.length > 2) {
          formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
        }

        if (input.value !== formatted) {
          input.value = formatted;
        }
      }}
      onBlur={() => setFieldTouched(name, true)}
      dateFormat="dd-MM-yyyy"
      placeholderText={placeholder}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      yearDropdownItemNumber={20}
      scrollableYearDropdown
      portalId="root-portal"
      popperProps={{ strategy: "fixed" }}
      {...props}
    />
  );
};

export default FormikDatePicker;
