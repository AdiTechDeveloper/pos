import React from "react";
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

  const getValueAsDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;

    if (typeof val === "string" && val.includes("-")) {
      const parts = val.split("-");
      if (parts[0].length === 4) {
        const [year, month, day] = parts;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
    }
    return new Date(val);
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  return (
    <DatePicker
      name={name}
      className={className}
      wrapperClassName="w-100 d-block"
      selected={getValueAsDate(field.value)}
      onChange={(date) => {
        const formattedDate = formatDateToYYYYMMDD(date);
        setFieldValue(name, formattedDate);
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
