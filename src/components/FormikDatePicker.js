import React, { useEffect, useMemo } from "react";
import { useField, useFormikContext } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/*
  Calendar popup portal me render hota hai (page ke bahar), aur react-datepicker ka
  default CSS rem me hai. Template ka root font-size chhota hone se calendar bahut chhota
  dikhta tha. Yahan sab kuch px me fix hai, taaki har page par same size aaye.
*/
const STYLE_ID = "formik-datepicker-styles";

const datepickerCss = `
  .react-datepicker-popper { z-index: 10050 !important; }

  .react-datepicker {
    font-family: inherit !important;
    font-size: 14px !important;
    border: 1px solid #b7c5d2 !important;
    border-radius: 12px !important;
    box-shadow: 0 12px 32px rgba(15, 27, 46, 0.18) !important;
    background: #fff !important;
    overflow: hidden;
  }
  .react-datepicker__triangle { display: none !important; }
  .react-datepicker__month-container { float: none !important; width: 308px; }

  .react-datepicker__header {
    background: #f5f8fb !important;
    border-bottom: 1px solid #e3eaf1 !important;
    padding: 12px 8px 6px !important;
  }
  .react-datepicker__current-month {
    font-size: 15px !important;
    font-weight: 700 !important;
    color: #3D3527;
  }

  /* Month / Year dropdowns */
  .react-datepicker__header__dropdown {
    display: flex !important;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 6px 0 8px !important;
  }
  .react-datepicker__month-dropdown-container,
  .react-datepicker__year-dropdown-container {
    margin: 0 !important;
  }
  .react-datepicker__month-select,
  .react-datepicker__year-select {
    width: auto !important;
    min-width: 96px;
    height: 34px !important;
    padding: 0 26px 0 10px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    line-height: 34px !important;
    color: #3D3527 !important;
    background-color: #fff !important;
    border: 1.5px solid #b7c5d2 !important;
    border-radius: 8px !important;
    cursor: pointer;
  }
  .react-datepicker__month-select:focus,
  .react-datepicker__year-select:focus {
    outline: none;
    border-color: #3894da !important;
    box-shadow: 0 0 0 3px rgba(56, 148, 218, 0.15);
  }

  /* Day grid */
  .react-datepicker__day-names,
  .react-datepicker__week { display: flex; justify-content: space-around; }
  .react-datepicker__month { margin: 6px 8px 10px !important; }
  .react-datepicker__day-name,
  .react-datepicker__day {
    width: 36px !important;
    height: 36px !important;
    line-height: 36px !important;
    margin: 2px !important;
    font-size: 14px !important;
    font-weight: 500;
    color: #3D3527;
    border-radius: 8px !important;
  }
  .react-datepicker__day-name {
    font-size: 12px !important;
    font-weight: 700 !important;
    color: #8A8170 !important;
    text-transform: uppercase;
  }
  .react-datepicker__day:hover { background: #e8f2fb !important; }
  .react-datepicker__day--today { font-weight: 700 !important; color: #3894da; }
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background: #3894da !important;
    color: #fff !important;
  }
  .react-datepicker__day--outside-month { color: #b9b4a8 !important; }
  .react-datepicker__day--disabled { color: #ccc !important; cursor: not-allowed; }
  .react-datepicker__day--disabled:hover { background: transparent !important; }

  /* Prev / next arrows */
  .react-datepicker__navigation {
    top: 12px !important;
    width: 32px !important;
    height: 32px !important;
  }
  .react-datepicker__navigation-icon::before {
    border-width: 2px 2px 0 0 !important;
    height: 9px !important;
    width: 9px !important;
    border-color: #6b7280 !important;
  }

  /* Input wrapper */
  .react-datepicker-wrapper { width: 100% !important; display: block !important; }
  .react-datepicker__input-container { display: block !important; width: 100% !important; }
`;

const FormikDatePicker = ({
  name,
  placeholder = "dd-mm-yyyy",
  className = "form-control",
  ...props
}) => {
  const [field] = useField(name);
  const { setFieldValue, setFieldTouched } = useFormikContext();

  // Style sirf ek baar page me inject hota hai (sabhi date pickers share karte hain)
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = datepickerCss;
    document.head.appendChild(style);
  }, []);

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
    [field.value],
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

        // A click on a calendar day also fires this handler, with no typed text.
        // Only handle real typing in the text box.
        if (!input || typeof input.value !== "string") return;

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
      autoComplete="off"
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