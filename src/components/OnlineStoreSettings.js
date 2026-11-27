import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import Layout from "./layout";
import { ONLINE_CSS } from "./onlineStyles";
import { ONLINE_TABLE_STYLES } from "./onlineTableStyles";
import OnlineProductLimits from "./OnlineProductLimits";
import StoreLogoUpload from "./StoreLogoUpload";

/* ================================================================== */
/*  VALIDATION (is file ke andar hi; alag module ki zarurat nahi)      */
/*                                                                    */
/*  - sanitize.*  : type / paste karte waqt galat characters hata deta */
/*                  hai ({ value, notice })                           */
/*  - finalize.*  : field se bahar jaate hi value saaf karta hai       */
/*  - validate*   : Save / Add dabane par final check                  */
/* ================================================================== */

// Limits (yahin se badlo, baaki code apne aap follow karega)
const LIMITS = {
  displayName: { min: 2, max: 150 },
  slug: { min: 3, max: 100 },
  address: { min: 5, max: 255 },
  about: { max: 1000 },
  maxMoney: 999999.99, // delivery charge, minimum order, pincode amounts
  maxFreeDelivery: 9999999.99, // "Free delivery above"
  stockPercent: { min: 0, max: 100 },
  maxQty: { min: 1, max: 10000 }, // per product per order
  prepMinutes: { min: 1, max: 1440 },
  maxPincodes: 200, // ek baar me
  pincodeText: 1400, // textarea ki max length (200 pincodes + separators)
};

// Form ke fields screen ke order me. Pehla galat field yahin se focus hota hai
// (element id = "ovx-f-" + key)
const FIELD_ORDER = [
  "display_name",
  "slug",
  "phone",
  "address",
  "about",
  "open_time",
  "close_time",
  "online_stock_percent",
  "max_qty_per_product",
  "delivery_mode",
  "delivery_charge",
  "free_delivery_above",
  "min_order_amount",
  "prep_minutes",
];

// \p{M} = combining marks (Hindi / Gujarati matras). Iske bina "हिन्दी" jaise naam ruk jaate hain.
const NAME_CHAR = /[\p{L}\p{M}\p{N} ]/u;
const ADDRESS_CHAR = /[\p{L}\p{M}\p{N} ,.#/()'’-]/u;
const ABOUT_CHAR = /[\p{L}\p{M}\p{N} .,!?'’"()/:;&%+-]/u;

const NAME_RE = /^[\p{L}\p{M}\p{N} ]+$/u;
const ADDRESS_RE = /^[\p{L}\p{M}\p{N} ,.#/()'’-]+$/u;
const ABOUT_RE = /^[\p{L}\p{M}\p{N} .,!?'’"()/:;&%+-]+$/u;
const HAS_LETTER = /\p{L}/u;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian mobile
const PINCODE_RE = /^[1-9]\d{5}$/; // Indian PIN kabhi 0 se shuru nahi hota
const MONEY_RE = /^\d+(\.\d{0,2})?$/;
const WHOLE_RE = /^\d+$/;
const LINK_RE =
  /(https?:|www\.|\b[a-z0-9-]+\.(com|in|net|org|co|io|me|shop|store|app|xyz)\b)/i;

const cleanText = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

const fmtMoney = (n) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "+91 98765 43210", "098765 43210", "9876543210" -> 10 digit
const cleanPhone = (raw) => {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

const normalizePhone = (raw) => cleanPhone(raw);

const parsePincodes = (text) => {
  const parts = String(text ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  return [...new Set(parts)];
};

/* ---------- sanitize: typing ke waqt ---------- */

const textSanitizer = (charRe, max, notice) => (raw) => {
  const original = String(raw ?? "").replace(/[\r\n\t]+/g, " ");
  const kept = Array.from(original).filter((ch) => charRe.test(ch)).join("");
  const removed = kept.length !== original.length;
  const value = kept.replace(/\s{2,}/g, " ").replace(/^\s+/, "").slice(0, max);
  return { value, notice: removed ? notice : "" };
};

const sanitize = {
  displayName: textSanitizer(
    NAME_CHAR,
    LIMITS.displayName.max,
    "Only letters, numbers and spaces are allowed here."
  ),

  address: textSanitizer(
    ADDRESS_CHAR,
    LIMITS.address.max,
    "Only letters, numbers, spaces and , . # / ( ) ' - are allowed here."
  ),

  // About: ek paragraph (new line space ban jaati hai)
  about: textSanitizer(
    ABOUT_CHAR,
    LIMITS.about.max,
    "Some symbols are not allowed and were removed."
  ),

  slug: (raw) => {
    const original = String(raw ?? "").toLowerCase().replace(/\s+/g, "-");
    const kept = original.replace(/[^a-z0-9-]/g, "");
    const value = kept
      .replace(/-{2,}/g, "-")
      .replace(/^-+/, "")
      .slice(0, LIMITS.slug.max);
    return {
      value,
      notice:
        kept.length !== original.length
          ? "Only small letters, numbers and hyphens are allowed here."
          : "",
    };
  },

  phone: (raw) => {
    const s = String(raw ?? "");
    const value = cleanPhone(s);
    return {
      value,
      notice: /[^\d\s+()-]/.test(s) ? "Phone number can contain digits only." : "",
    };
  },

  // Poori sankhya (maxDigits tak)
  whole: (maxDigits) => (raw) => {
    const s = String(raw ?? "");
    const digits = s.replace(/\D/g, "");
    const value = digits.replace(/^0+(?=\d)/, "").slice(0, maxDigits);
    return {
      value,
      notice: digits.length !== s.length ? "Only whole numbers are allowed here." : "",
    };
  },

  // Rupaye: intDigits = decimal se pehle kitne digit, baad me max 2
  money: (intDigits) => (raw) => {
    const s = String(raw ?? "");
    const stripped = s.replace(/[^\d.]/g, "");
    let notice = stripped.length !== s.length ? "Only numbers are allowed here." : "";

    const dot = stripped.indexOf(".");
    let intPart = dot === -1 ? stripped : stripped.slice(0, dot);
    let frac = dot === -1 ? null : stripped.slice(dot + 1).replace(/\./g, "");

    if (frac !== null && frac.length > 2) {
      frac = frac.slice(0, 2);
      notice = notice || "Only 2 decimal places are allowed.";
    }
    if (intPart.length > intDigits) {
      intPart = intPart.slice(0, intDigits);
      notice = notice || `Amount can have at most ${intDigits} digits before the decimal point.`;
    }
    intPart = intPart.replace(/^0+(?=\d)/, "");
    if (frac !== null && intPart === "") intPart = "0";

    return { value: frac === null ? intPart : `${intPart}.${frac}`, notice };
  },

  // Pincodes: digits, comma, space, new line
  pincodes: (raw) => {
    const s = String(raw ?? "");
    const value = s.replace(/[^\d,\s]/g, "").slice(0, LIMITS.pincodeText);
    return {
      value,
      notice:
        value.length !== s.length && /[^\d,\s]/.test(s)
          ? "Only digits, commas, spaces and new lines are allowed here."
          : "",
    };
  },
};

/* ---------- finalize: field se bahar jaate hi ---------- */

const finalize = {
  text: (v) => cleanText(v),
  slug: (v) => String(v ?? "").replace(/^-+|-+$/g, ""),
  // "5." -> "5", "." -> ""
  money: (v) => {
    const s = String(v ?? "");
    if (s === "" || s === ".") return "";
    return s.endsWith(".") ? s.slice(0, -1) : s;
  },
};

/* ---------- field checks ---------- */

const checkMoney = (value, { label, max, required = false, positive = false }) => {
  const v = String(value ?? "").trim();
  if (v === "") return required ? `${label} is required (enter 0 if none).` : "";
  if (!MONEY_RE.test(v)) {
    return `${label} must be a valid amount with up to 2 decimal places.`;
  }
  const n = Number(v);
  if (n > max) return `${label} cannot be more than ₹${fmtMoney(max)}.`;
  if (positive && n <= 0) {
    return `${label} must be greater than 0 (leave it empty for none).`;
  }
  return "";
};

const checkWhole = (value, { label, min, max, required = false }) => {
  const v = String(value ?? "").trim();
  if (v === "") return required ? `${label} is required.` : "";
  if (!WHOLE_RE.test(v)) return `${label} must be a whole number.`;
  const n = Number(v);
  if (n < min || n > max) {
    return `${label} must be between ${min.toLocaleString("en-IN")} and ${max.toLocaleString("en-IN")}.`;
  }
  return "";
};

/* ---------- main settings form ---------- */

function validateSettings(values) {
  const e = {};

  // Display name (optional)
  const name = cleanText(values.display_name);
  if (name) {
    if (name.length < LIMITS.displayName.min) {
      e.display_name = `Display name must be at least ${LIMITS.displayName.min} characters.`;
    } else if (name.length > LIMITS.displayName.max) {
      e.display_name = `Display name can be at most ${LIMITS.displayName.max} characters.`;
    } else if (!NAME_RE.test(name)) {
      e.display_name = "Display name can contain only letters, numbers and spaces.";
    } else if (!HAS_LETTER.test(name)) {
      e.display_name = "Display name must contain at least one letter.";
    }
  }

  // Store link name (optional)
  const slug = String(values.slug ?? "").trim();
  if (slug) {
    if (slug.length < LIMITS.slug.min) {
      e.slug = `Store link name must be at least ${LIMITS.slug.min} characters.`;
    } else if (!SLUG_RE.test(slug)) {
      e.slug =
        "Use small letters and numbers only. Hyphens are allowed between words (not at the start or end).";
    }
  }

  // Phone (optional)
  const phone = String(values.phone ?? "").trim();
  if (phone && !PHONE_RE.test(phone)) {
    e.phone = "Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9).";
  }

  // Address (optional)
  const address = cleanText(values.address);
  if (address) {
    if (address.length < LIMITS.address.min) {
      e.address = `Address must be at least ${LIMITS.address.min} characters.`;
    } else if (address.length > LIMITS.address.max) {
      e.address = `Address can be at most ${LIMITS.address.max} characters.`;
    } else if (!ADDRESS_RE.test(address)) {
      e.address = "Address contains characters that are not allowed.";
    }
  }

  // About (optional)
  const about = cleanText(values.about);
  if (about) {
    if (about.length > LIMITS.about.max) {
      e.about = `About can be at most ${LIMITS.about.max} characters.`;
    } else if (!ABOUT_RE.test(about)) {
      e.about = "About contains characters that are not allowed.";
    } else if (LINK_RE.test(about)) {
      e.about = "Links and website addresses are not allowed in the description.";
    }
  }

  // Timings: dono ya dono khaali
  const open = values.open_time || "";
  const close = values.close_time || "";
  if (open && !close) {
    e.close_time = "Select the closing time too, or clear the opening time.";
  } else if (!open && close) {
    e.open_time = "Select the opening time too, or clear the closing time.";
  } else if (open && close && open === close) {
    e.close_time = "Closing time must be different from the opening time.";
  }

  // Online stock share
  const stock = checkWhole(values.online_stock_percent, {
    label: "Online stock share",
    min: LIMITS.stockPercent.min,
    max: LIMITS.stockPercent.max,
    required: true,
  });
  if (stock) e.online_stock_percent = stock;

  // Max qty per product (optional)
  const maxQty = checkWhole(values.max_qty_per_product, {
    label: "Max quantity",
    min: LIMITS.maxQty.min,
    max: LIMITS.maxQty.max,
  });
  if (maxQty) e.max_qty_per_product = maxQty;

  // Delivery / pickup: online store ON hai to kam se kam ek mode chahiye
  if (values.is_online_enabled && !values.accepts_delivery && !values.accepts_pickup) {
    e.delivery_mode =
      "Turn on home delivery or pickup. With both off, customers cannot place orders.";
  }

  // Amounts
  const charge = checkMoney(values.delivery_charge, {
    label: "Delivery charge",
    max: LIMITS.maxMoney,
    required: true,
  });
  if (charge) e.delivery_charge = charge;

  const minOrder = checkMoney(values.min_order_amount, {
    label: "Minimum order",
    max: LIMITS.maxMoney,
    required: true,
  });
  if (minOrder) e.min_order_amount = minOrder;

  const free = checkMoney(values.free_delivery_above, {
    label: "Free delivery limit",
    max: LIMITS.maxFreeDelivery,
    positive: true,
  });
  if (free) {
    e.free_delivery_above = free;
  } else if (
    String(values.free_delivery_above ?? "").trim() !== "" &&
    !minOrder &&
    Number(values.free_delivery_above) < Number(values.min_order_amount || 0)
  ) {
    e.free_delivery_above = `Free delivery limit should be at least the minimum order (₹${fmtMoney(
      Number(values.min_order_amount || 0)
    )}).`;
  }

  // Prepare time
  const prep = checkWhole(values.prep_minutes, {
    label: "Prepare time",
    min: LIMITS.prepMinutes.min,
    max: LIMITS.prepMinutes.max,
    required: true,
  });
  if (prep) e.prep_minutes = prep;

  return e;
}

/* ---------- API payload ---------- */

function buildSettingsPayload(form) {
  const num = (v, d = 0) => (v === "" || v === null || v === undefined ? d : Number(v));
  const slug = String(form.slug ?? "").trim();

  return {
    ...form,
    display_name: cleanText(form.display_name),
    slug: slug || null,
    phone: String(form.phone ?? "").trim(),
    address: cleanText(form.address),
    about: cleanText(form.about),
    min_order_amount: num(form.min_order_amount),
    delivery_charge: num(form.delivery_charge),
    free_delivery_above:
      form.free_delivery_above === "" || form.free_delivery_above == null
        ? null
        : Number(form.free_delivery_above),
    prep_minutes: num(form.prep_minutes, 30),
    online_stock_percent: num(form.online_stock_percent, 50),
    open_time: form.open_time || null,
    close_time: form.close_time || null,
    max_qty_per_product:
      form.max_qty_per_product === "" || form.max_qty_per_product == null
        ? null
        : Number(form.max_qty_per_product),
  };
}

/* ---------- backend (422) errors -> form fields ---------- */

const SERVER_KEY_MAP = {
  accepts_delivery: "delivery_mode",
  accepts_pickup: "delivery_mode",
};

function serverFieldErrors(err) {
  const raw = err?.response?.data?.errors;
  const out = {};
  if (raw && typeof raw === "object") {
    Object.entries(raw).forEach(([key, val]) => {
      const field = SERVER_KEY_MAP[key] || key;
      if (FIELD_ORDER.includes(field) && !out[field]) {
        out[field] = Array.isArray(val) ? val[0] : String(val);
      }
    });
  }
  return out;
}

/* ---------- pincodes ---------- */

function validatePincodeAdd({ pins, charge, min }) {
  const e = {};
  const list = parsePincodes(pins);

  if (!list.length) {
    e.pins = "Enter at least one pincode.";
  } else {
    const bad = list.find((p) => !PINCODE_RE.test(p));
    if (bad) {
      e.pins = `"${bad}" is not a valid pincode. Each pincode must be 6 digits and cannot start with 0.`;
    } else if (list.length > LIMITS.maxPincodes) {
      e.pins = `You can add at most ${LIMITS.maxPincodes} pincodes at a time (you entered ${list.length}).`;
    }
  }

  const c = checkMoney(charge, { label: "Delivery charge", max: LIMITS.maxMoney });
  if (c) e.charge = c;

  const m = checkMoney(min, { label: "Minimum order", max: LIMITS.maxMoney });
  if (m) e.min = m;

  return e;
}

// Table me inline edit (khaali = store default)
function validateRowDraft(draft) {
  const e = {};
  const c = checkMoney(draft.delivery_charge, {
    label: "Delivery charge",
    max: LIMITS.maxMoney,
  });
  if (c) e.delivery_charge = c;

  const m = checkMoney(draft.min_order_amount, {
    label: "Minimum order",
    max: LIMITS.maxMoney,
  });
  if (m) e.min_order_amount = m;

  return e;
}

/* ================================================================== */
/*  Styles                                                            */
/* ================================================================== */

// Validation ke error / counter ki styling (baaki styling onlineStyles.js me hai)
const VALIDATION_CSS = `
.ovx .ovx-ferr { display: block; margin-top: 6px; font-size: 12px; line-height: 1.4; font-weight: 600; color: #dc2626; }
.ovx .ovx-input.ovx-invalid, .ovx .ovx-time-trigger.invalid { border-color: #dc2626 !important; }
.ovx .ovx-input.ovx-invalid:focus { box-shadow: 0 0 0 3px rgba(220,38,38,.15) !important; }
.ovx .ovx-fcount { display: block; margin-top: 4px; text-align: right; font-size: 11px; color: #94a3b8; }
.ovx .ovx-req { color: #dc2626; }
.ovx .ovx-cellfield { padding: 6px 0; }
.ovx .ovx-cellfield .ovx-ferr { max-width: 220px; }
`;

// Branch ka on/off switch
const BRANCH_CSS = `
.ovx .ovx-bsw-wrap { display: flex !important; align-items: center !important; gap: 8px !important; flex-shrink: 0 !important; }
.ovx .ovx-bsw { position: relative !important; display: block !important; width: 44px !important; height: 24px !important; padding: 0 !important; border: 0 !important; border-radius: 12px !important; background: #cbd5e1 !important; cursor: pointer !important; flex-shrink: 0 !important; transition: background .15s !important; }
.ovx .ovx-bsw.on { background: #2563eb !important; }
.ovx .ovx-bsw:disabled { opacity: .55 !important; cursor: wait !important; }
.ovx .ovx-bsw:focus-visible { outline: 2px solid #2563eb !important; outline-offset: 2px !important; }
.ovx .ovx-bsw-knob { position: absolute !important; top: 3px !important; left: 3px !important; width: 18px !important; height: 18px !important; border-radius: 50% !important; background: #fff !important; transition: left .15s !important; }
.ovx .ovx-bsw.on .ovx-bsw-knob { left: 23px !important; }
.ovx .ovx-bsw-label { min-width: 28px !important; font-size: 12px !important; font-weight: 700 !important; color: #64748b !important; }
.ovx .ovx-bsw.on + .ovx-bsw-label { color: #1d4ed8 !important; }
.ovx .ovx-list li.is-off .ovx-list-name { color: #94a3b8 !important; }
.ovx .ovx-list li.is-off a { color: #94a3b8 !important; }
.ovx .ovx-bstat-list { list-style: none !important; margin: 0 !important; padding: 0 !important; display: grid !important; gap: 10px !important; }
.ovx .ovx-bstat { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 14px !important; flex-wrap: wrap !important; padding: 14px 16px !important; border: 1px solid #e2e8f0 !important; border-radius: 12px !important; background: #fff !important; }
.ovx .ovx-bstat.is-open { border-left: 4px solid #16a34a !important; }
.ovx .ovx-bstat.is-closed { border-left: 4px solid #dc2626 !important; background: #fef2f2 !important; }
.ovx .ovx-bstat-name { margin: 0 !important; font-size: 15px !important; font-weight: 700 !important; color: #172033 !important; }
.ovx .ovx-bstat-state { display: inline-block !important; margin-top: 4px !important; padding: 2px 10px !important; border-radius: 999px !important; font-size: 12px !important; font-weight: 700 !important; }
.ovx .ovx-bstat.is-open .ovx-bstat-state { background: #dcfce7 !important; color: #15803d !important; }
.ovx .ovx-bstat.is-closed .ovx-bstat-state { background: #fee2e2 !important; color: #b91c1c !important; }
.ovx .ovx-bstat-btn { min-width: 130px !important; height: 40px !important; padding: 0 18px !important; border-radius: 10px !important; font-size: 14px !important; font-weight: 700 !important; cursor: pointer !important; border: 1.5px solid transparent !important; }
.ovx .ovx-bstat-btn.do-close { background: #fff !important; color: #dc2626 !important; border-color: #dc2626 !important; }
.ovx .ovx-bstat-btn.do-open { background: #16a34a !important; color: #fff !important; border-color: #16a34a !important; }
.ovx .ovx-bstat-btn:disabled { opacity: .55 !important; cursor: wait !important; }
.ovx .ovx-note { margin: 0 0 12px !important; padding: 10px 12px !important; border-radius: 10px !important; font-size: 13px !important; line-height: 1.5 !important; background: #fffbeb !important; border: 1px solid #fde68a !important; color: #92400e !important; }
`;

const TIME_PICKER_CSS = `
.ovx .ovx-time-picker { position: relative; width: 100%; z-index: 1; }
.ovx .ovx-time-picker:has(.ovx-time-popup) { z-index: 120; }
.ovx .ovx-time-trigger {
  box-sizing: border-box; width: 100%; min-height: 72px; display: flex; align-items: center;
  gap: 12px; padding: 11px 14px; border: 1px solid #dbe3ef; border-radius: 14px;
  background: #fff; color: #172033; text-align: left; cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.ovx .ovx-time-trigger:hover, .ovx .ovx-time-trigger.active {
  border-color: #6257f5; box-shadow: 0 0 0 3px rgba(98,87,245,.09);
}
.ovx .ovx-time-icon {
  box-sizing: border-box; width: 42px; height: 42px; display: grid; place-items: center;
  flex: 0 0 42px; border-radius: 12px; background: #f0efff; color: #5548ee;
}
.ovx .ovx-time-content { display: grid; gap: 4px; flex: 1; min-width: 0; }
.ovx .ovx-time-label { font-size: 12px; line-height: 1.3; color: #64748b; font-weight: 600; }
.ovx .ovx-time-value { font-size: 17px; line-height: 1.35; font-weight: 700; color: #172033; }
.ovx .ovx-time-value.placeholder { color: #94a3b8; font-size: 16px; font-weight: 500; }
.ovx .ovx-time-chevron { flex: 0 0 auto; color: #64748b; font-size: 20px; line-height: 1; }
.ovx .ovx-time-popup {
  box-sizing: border-box; position: absolute; top: calc(100% + 10px); left: 0; z-index: 130;
  width: min(360px, 100%, calc(100vw - 32px)); padding: 18px; border: 1px solid #e5eaf2;
  border-radius: 18px; background: #fff; box-shadow: 0 18px 50px rgba(15,23,42,.18);
}
.ovx .ovx-time-popup-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.ovx .ovx-time-popup-head strong { display: block; color: #172033; font-size: 16px; line-height: 1.35; font-weight: 750; }
.ovx .ovx-time-popup-head p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.4; }
.ovx .ovx-time-close {
  box-sizing: border-box; width: 32px; height: 32px; padding: 0; display: grid; place-items: center;
  border: 1px solid #e5eaf2; border-radius: 9px; background: #fff; color: #64748b;
  font-size: 21px; line-height: 1; cursor: pointer;
}
.ovx .ovx-time-selection { display: grid; grid-template-columns: minmax(0,1fr) 16px minmax(0,1fr); align-items: end; gap: 9px; }
.ovx .ovx-time-select-group { min-width: 0; }
.ovx .ovx-time-select-label { display: block; margin: 0 0 8px; color: #64748b; font-size: 12px; line-height: 1.2; font-weight: 700; }
.ovx .ovx-time-select-group select {
  box-sizing: border-box; display: block; width: 100%; height: 52px; margin: 0; padding: 0 12px;
  border: 1px solid #dfe6f0; border-radius: 11px; background: #f8fafc; color: #172033;
  font-family: inherit; font-size: 18px; line-height: normal; font-weight: 750; outline: none;
}
.ovx .ovx-time-select-group select:focus { border-color: #6257f5; box-shadow: 0 0 0 3px rgba(98,87,245,.08); }
.ovx .ovx-time-colon { align-self: end; padding-bottom: 13px; text-align: center; color: #64748b; font-size: 20px; line-height: 1; font-weight: 800; }
.ovx .ovx-time-period { display: grid; grid-column: 1 / -1; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 4px; padding: 4px; border-radius: 11px; background: #f1f5f9; }
.ovx .ovx-time-period button {
  box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  width: 100%; min-width: 0; height: 38px; margin: 0; padding: 0 12px;
  border: 0; border-radius: 8px; background: transparent; color: #64748b;
  font-family: inherit; font-size: 13px; line-height: 1; font-weight: 750; cursor: pointer;
}
.ovx .ovx-time-period button.selected { background: #5548ee; color: #fff; box-shadow: 0 2px 5px rgba(85,72,238,.2); }
.ovx .ovx-time-preview { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding: 13px 14px; border-radius: 11px; background: #f7f8fc; }
.ovx .ovx-time-preview span { color: #64748b; font-size: 13px; line-height: 1.3; }
.ovx .ovx-time-preview strong { color: #5548ee; font-size: 17px; line-height: 1.3; font-weight: 800; white-space: nowrap; }
.ovx .ovx-time-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; }
.ovx .ovx-time-clear, .ovx .ovx-time-done {
  box-sizing: border-box; min-height: 42px; display: inline-flex; align-items: center; justify-content: center;
  margin: 0; padding: 0 16px; border-radius: 10px; font-family: inherit; font-size: 13px;
  line-height: 1; font-weight: 750; cursor: pointer;
}
.ovx .ovx-time-clear { border: 1px solid #e2e8f0; background: #fff; color: #64748b; }
.ovx .ovx-time-done { border: 1px solid #5548ee; background: #5548ee; color: #fff; }
.ovx .ovx-time-done:hover { background: #4639dc; }
@media (max-width: 600px) {
  .ovx .ovx-time-popup { width: min(360px, 100%, calc(100vw - 32px)); padding: 16px; }
}
`;

const STOREFRONT_URL =
  process.env.REACT_APP_STOREFRONT_URL || "https://store.vakro.in";

const errorText = (err, fallback) => {
  const errors = err?.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return err?.response?.data?.message || fallback;
};

const EMPTY = {
  is_online_enabled: true,
  slug: "",
  display_name: "",
  about: "",
  phone: "",
  address: "",
  open_time: "",
  close_time: "",
  accepts_delivery: true,
  accepts_pickup: true,
  min_order_amount: "0",
  delivery_charge: "0",
  free_delivery_above: "",
  prep_minutes: "10",
  online_stock_percent: "50",
  max_qty_per_product: ""
};

// Normalize MySQL TIME values (HH:mm:ss) to HH:mm for the form.
const normalizeTime = (value) => (value ? String(value).slice(0, 5) : "");

// API se aaya data -> form (sab kuch string, taaki input control rahe)
const toForm = (s) => ({
  is_online_enabled: !!s.is_online_enabled,
  slug: s.slug || "",
  display_name: s.display_name || "",
  about: s.about || "",
  phone: normalizePhone(s.phone),
  address: s.address || "",
  open_time: normalizeTime(s.open_time),
  close_time: normalizeTime(s.close_time),
  accepts_delivery: !!s.accepts_delivery,
  accepts_pickup: !!s.accepts_pickup,
  min_order_amount: String(s.min_order_amount ?? 0),
  delivery_charge: String(s.delivery_charge ?? 0),
  free_delivery_above:
    s.free_delivery_above === null || s.free_delivery_above === undefined
      ? ""
      : String(s.free_delivery_above),
  prep_minutes: String(s.prep_minutes ?? 30),
  online_stock_percent: String(s.online_stock_percent ?? 50),
  max_qty_per_product:
    s.max_qty_per_product === null || s.max_qty_per_product === undefined
      ? ""
      : String(s.max_qty_per_product),
});

function Card({ title, hint, children }) {
  return (
    <section className="ovx-card">
      <h4 className="ovx-card-title">{title}</h4>
      {hint && <p className="ovx-card-hint">{hint}</p>}
      {children}
    </section>
  );
}

// error = laal message, hint = halka madad text, count/max = "12/60" counter
function Field({ label, hint, error, required, count, max, children }) {
  return (
    <label className="ovx-field">
      <span className="ovx-label">
        {label}
        {required && <span className="ovx-req" aria-hidden="true"> *</span>}
      </span>
      {children}
      {max != null && (
        <span className="ovx-fcount">
          {count}/{max}
        </span>
      )}
      {error && (
        <span className="ovx-ferr" aria-live="polite">
          {error}
        </span>
      )}
      {hint && <span className="ovx-fhint">{hint}</span>}
    </label>
  );
}

function TimePicker({ id, invalid, label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");
  const pickerRef = useRef(null);

  const parseTime = (time) => {
    if (!time) return null;
    const [hours, minutes] = String(time).slice(0, 5).split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    return {
      hour: String(hours % 12 || 12).padStart(2, "0"),
      minute: String(minutes).padStart(2, "0"),
      period: hours >= 12 ? "PM" : "AM",
    };
  };

  useEffect(() => {
    if (!open) return;
    const parsed = parseTime(value);
    setHour(parsed?.hour || "09");
    setMinute(parsed?.minute || "00");
    setPeriod(parsed?.period || "AM");
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const applyTime = () => {
    let hours = Number(hour) % 12;
    if (period === "PM") hours += 12;
    onChange(`${String(hours).padStart(2, "0")}:${minute}`);
    setOpen(false);
  };

  const clearTime = () => {
    onChange("");
    setOpen(false);
  };

  const selectedTime = parseTime(value);
  const displayTime = selectedTime
    ? `${selectedTime.hour}:${selectedTime.minute} ${selectedTime.period}`
    : "Select time";

  return (
    <div className="ovx-time-picker" ref={pickerRef}>
      <button
        id={id}
        type="button"
        aria-label={`${label}: ${displayTime}`}
        aria-expanded={open}
        aria-invalid={invalid ? "true" : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`ovx-time-trigger ${open ? "active" : ""} ${invalid ? "invalid" : ""}`}
      >
        <span className="ovx-time-icon" aria-hidden="true">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span className="ovx-time-content">
          <span className="ovx-time-label">{label}</span>
          <span className={`ovx-time-value ${!value ? "placeholder" : ""}`}>
            {displayTime}
          </span>
        </span>
        <span className="ovx-time-chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="ovx-time-popup" role="dialog" aria-label={`Choose ${label}`}>
          <div className="ovx-time-popup-head">
            <div>
              <strong>Select {label.toLowerCase()}</strong>
              <p>Choose your preferred time</p>
            </div>
            <button
              type="button"
              aria-label="Close time picker"
              onClick={() => setOpen(false)}
              className="ovx-time-close"
            >
              ×
            </button>
          </div>

          <div className="ovx-time-selection">
            <div className="ovx-time-select-group">
              <span className="ovx-time-select-label">Hour</span>
              <select
                aria-label={`${label} hour`}
                value={hour}
                onChange={(event) => setHour(event.target.value)}
              >
                {Array.from({ length: 12 }, (_, index) => {
                  const option = String(index + 1).padStart(2, "0");
                  return <option key={option} value={option}>{option}</option>;
                })}
              </select>
            </div>

            <span className="ovx-time-colon" aria-hidden="true">:</span>

            <div className="ovx-time-select-group">
              <span className="ovx-time-select-label">Minute</span>
              <select
                aria-label={`${label} minute`}
                value={minute}
                onChange={(event) => setMinute(event.target.value)}
              >
                {Array.from({ length: 60 }, (_, index) => {
                  const option = String(index).padStart(2, "0");
                  return <option key={option} value={option}>{option}</option>;
                })}
              </select>
            </div>

            <div className="ovx-time-period" aria-label="AM or PM">
              <button
                type="button"
                aria-pressed={period === "AM"}
                className={period === "AM" ? "selected" : ""}
                onClick={() => setPeriod("AM")}
              >AM</button>
              <button
                type="button"
                aria-pressed={period === "PM"}
                className={period === "PM" ? "selected" : ""}
                onClick={() => setPeriod("PM")}
              >PM</button>
            </div>
          </div>

          <div className="ovx-time-preview">
            <span>Selected time</span>
            <strong>{hour}:{minute} {period}</strong>
          </div>

          <div className="ovx-time-actions">
            <button type="button" className="ovx-time-clear" onClick={clearTime}>Clear</button>
            <button type="button" className="ovx-time-done" onClick={applyTime}>Apply time</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`ovx-toggle ${checked ? "on" : ""}`}
    >
      <span>
        <span className="ovx-toggle-title">{label}</span>
        {hint && <span className="ovx-toggle-hint">{hint}</span>}
      </span>
      <span className="ovx-switch">
        <span className="ovx-knob" />
      </span>
    </button>
  );
}

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const showAmount = (v) =>
  v === null || v === undefined || v === "" ? (
    <span className="ovx-dim">Default</span>
  ) : (
    `₹${v}`
  );

export default function OnlineStoreSettings() {
  const user_data = JSON.parse(localStorage.getItem("user_detail") || "null");
  const role = user_data?.user?.role;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [storeName, setStoreName] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [listings, setListings] = useState([]);
  const [branchBusy, setBranchBusy] = useState(null); // jis branch ka switch abhi save ho raha hai
  const [pincodes, setPincodes] = useState([]);

  // ---- main form ka validation
  const [touched, setTouched] = useState({}); // jis field se user bahar nikal chuka
  const [tried, setTried] = useState(false); // Save dabaya ja chuka
  const [notice, setNotice] = useState({}); // "ye character allowed nahi" (typing ke waqt)
  const [serverErrors, setServerErrors] = useState({}); // backend ke 422 errors
  const errors = useMemo(() => validateSettings(form), [form]);
  const errorOf = (key) =>
    notice[key] || serverErrors[key] || (tried || touched[key] ? errors[key] : "") || "";
  const inputCls = (key) => `ovx-input${errorOf(key) ? " ovx-invalid" : ""}`;

  // ---- naye pincodes ka form
  const [pins, setPins] = useState("");
  const [pinCharge, setPinCharge] = useState("");
  const [pinMin, setPinMin] = useState("");
  const [adding, setAdding] = useState(false);
  const [pinTried, setPinTried] = useState(false);
  const [pinTouched, setPinTouched] = useState({});
  const [pinNotice, setPinNotice] = useState({});
  const [pinServerError, setPinServerError] = useState("");
  const pinErrors = useMemo(
    () => validatePincodeAdd({ pins, charge: pinCharge, min: pinMin }),
    [pins, pinCharge, pinMin]
  );
  const pinErrorOf = (key) =>
    pinNotice[key] ||
    (key === "pins" ? pinServerError : "") ||
    (pinTried || pinTouched[key] ? pinErrors[key] : "") ||
    "";
  const pinCls = (key) => `ovx-input${pinErrorOf(key) ? " ovx-invalid" : ""}`;

  // ---- pincode table: inline edit
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ delivery_charge: "", min_order_amount: "" });
  const [draftNotice, setDraftNotice] = useState({});
  const [rowSaving, setRowSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(null);
  const draftErrors = useMemo(() => validateRowDraft(draft), [draft]);
  const draftErrorOf = (key) => draftNotice[key] || draftErrors[key] || "";

  const apply = useCallback((data) => {
    setStoreName(data.store_name || "");
    setForm(toForm(data.settings));
    setListings(data.listings || []);
    setPincodes(data.pincodes || []);
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      try {
        const res = await axios.get("/api/online/settings");
        apply(res.data.data);
      } catch (e) {
        setLoadError(errorText(e, "Could not load online store settings."));
      } finally {
        setLoading(false);
      }
    })();
  }, [role, apply]);

  // Galat field par scroll + focus
  const focusById = (id) => {
    window.requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof el.focus === "function") el.focus({ preventScroll: true });
    });
  };

  // Text / number inputs: type karte hi galat character hata do + kaaran dikhao
  const change = (key, sanitizer) => (e) => {
    const { value, notice: msg } = sanitizer(e.target.value);
    setForm((f) => ({ ...f, [key]: value }));
    setNotice((n) => (n[key] || msg ? { ...n, [key]: msg } : n));
    setServerErrors((s) => (s[key] ? { ...s, [key]: "" } : s));
  };

  // Field se bahar jaate hi: touched, notice saaf, aur finalize (trim / "5." -> "5")
  const blur = (key, finalizer) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setNotice((n) => (n[key] ? { ...n, [key]: "" } : n));
    if (finalizer) {
      setForm((f) => {
        const next = finalizer(f[key]);
        return next === f[key] ? f : { ...f, [key]: next };
      });
    }
  };

  const changeTime = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setTouched((t) => ({ ...t, open_time: true, close_time: true }));
    setServerErrors((s) => ({ ...s, open_time: "", close_time: "" }));
  };

  const setBool = (key) => (v) => {
    setForm((f) => ({ ...f, [key]: v }));
    setServerErrors((s) => ({ ...s, delivery_mode: "" }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    setTried(true);

    const found = validateSettings(form);
    const firstKey = FIELD_ORDER.find((k) => found[k]);
    if (firstKey) {
      setFormError("Please correct the highlighted fields and save again.");
      toast.error(found[firstKey]);
      focusById(`ovx-f-${firstKey}`);
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put("/api/online/settings", buildSettingsPayload(form));
      apply(res.data.data);
      setTried(false);
      setTouched({});
      setNotice({});
      setServerErrors({});
      toast.success("Online store settings saved.");
    } catch (err) {
      const fieldErrors = serverFieldErrors(err);
      setServerErrors(fieldErrors);
      const msg = errorText(err, "Could not save settings.");
      setFormError(msg);
      toast.error(msg);
      const first = FIELD_ORDER.find((k) => fieldErrors[k]);
      if (first) focusById(`ovx-f-${first}`);
    } finally {
      setSaving(false);
    }
  };

  // ---- pincodes add
  const changePin = (key, setter, sanitizer) => (e) => {
    const { value, notice: msg } = sanitizer(e.target.value);
    setter(value);
    setPinNotice((n) => (n[key] || msg ? { ...n, [key]: msg } : n));
    if (key === "pins") setPinServerError("");
  };

  const blurPin = (key, setter, finalizer) => () => {
    setPinTouched((t) => ({ ...t, [key]: true }));
    setPinNotice((n) => (n[key] ? { ...n, [key]: "" } : n));
    if (finalizer && setter) setter((v) => finalizer(v));
  };

  const addPincodes = async () => {
    if (adding) return;
    setPinTried(true);
    const firstKey = ["pins", "charge", "min"].find((k) => pinErrors[k]);
    if (firstKey) {
      toast.error(pinErrors[firstKey]);
      focusById(`ovx-p-${firstKey}`);
      return;
    }

    setAdding(true);
    setPinServerError("");
    try {
      // Saaf, duplicate-free list hi bhejo
      const body = { pincodes: parsePincodes(pins).join(", ") };
      if (pinCharge !== "") body.delivery_charge = Number(pinCharge);
      if (pinMin !== "") body.min_order_amount = Number(pinMin);
      const res = await axios.post("/api/online/pincodes", body);
      setPincodes(res.data.data);
      setPins("");
      setPinCharge("");
      setPinMin("");
      setPinTried(false);
      setPinTouched({});
      setPinNotice({});
      toast.success(res.data.message || "Pincodes added.");
    } catch (err) {
      const msg = errorText(err, "Could not add pincodes.");
      setPinServerError(msg);
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const updatePincode = async (id, body) => {
    try {
      const res = await axios.put(`/api/online/pincodes/${id}`, body);
      setPincodes(res.data.data);
      return true;
    } catch (err) {
      toast.error(errorText(err, "Could not update the pincode."));
      return false;
    }
  };

  const togglePincode = async (row) => {
    if (statusBusy) return;
    setStatusBusy(row.id);
    await updatePincode(row.id, { is_active: !row.is_active });
    setStatusBusy(null);
  };

  const deletePincode = async (row) => {
    if (!window.confirm(`Remove pincode ${row.pincode}? Customers there will not get delivery.`))
      return;
    try {
      const res = await axios.delete(`/api/online/pincodes/${row.id}`);
      setPincodes(res.data.data);
    } catch (err) {
      toast.error(errorText(err, "Could not remove the pincode."));
    }
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setDraftNotice({});
    setDraft({
      delivery_charge: row.delivery_charge === null || row.delivery_charge === undefined ? "" : String(row.delivery_charge),
      min_order_amount: row.min_order_amount === null || row.min_order_amount === undefined ? "" : String(row.min_order_amount),
    });
  };

  const changeDraft = (key) => (e) => {
    const { value, notice: msg } = sanitize.money(6)(e.target.value);
    setDraft((d) => ({ ...d, [key]: value }));
    setDraftNotice((n) => (n[key] || msg ? { ...n, [key]: msg } : n));
  };

  const saveEdit = async (row) => {
    if (rowSaving) return;
    const first = Object.values(draftErrors)[0];
    if (first) {
      toast.error(first);
      return;
    }
    setRowSaving(true);
    const ok = await updatePincode(row.id, {
      delivery_charge: draft.delivery_charge === "" ? null : Number(draft.delivery_charge),
      min_order_amount: draft.min_order_amount === "" ? null : Number(draft.min_order_amount),
    });
    setRowSaving(false);
    if (ok) setEditId(null);
  };

  // Branch ko online store par on / off (turant save; baaki form ko haath nahi lagata)
  const toggleBranch = async (l) => {
    if (branchBusy) return;
    const next = l.online_enabled === false; // abhi OFF hai to ON karo, warna OFF
    if (
      !next &&
      !window.confirm(
        `Close ${l.name}?\n\nCustomers will not see this branch and cannot place new orders for it. Orders already placed are not affected.`
      )
    ) {
      return;
    }

    setBranchBusy(l.branch_id);
    try {
      const res = await axios.put(`/api/online/branches/${l.branch_id}`, { online_enabled: next });
      setListings(res.data.data.listings || []);
      toast.success(res.data.message || (next ? `${l.name} is now open.` : `${l.name} is now closed.`));
    } catch (err) {
      toast.error(errorText(err, "Could not update this branch."));
    } finally {
      setBranchBusy(null);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied.");
    } catch (e) {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const pincodeColumns = [
    {
      name: "Pincode",
      selector: (r) => r.pincode,
      sortable: true,
      cell: (r) => <strong style={{ fontSize: 15 }}>{r.pincode}</strong>,
    },
    {
      name: "Charge (₹)",
      selector: (r) => Number(r.delivery_charge ?? 0),
      sortable: true,
      cell: (r) =>
        editId === r.id ? (
          <div className="ovx-cellfield">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={9}
              placeholder="Default"
              aria-label="Delivery charge"
              aria-invalid={draftErrorOf("delivery_charge") ? "true" : undefined}
              className={`ovx-input ovx-sm${draftErrorOf("delivery_charge") ? " ovx-invalid" : ""}`}
              value={draft.delivery_charge}
              onChange={changeDraft("delivery_charge")}
              onBlur={() => setDraft((d) => ({ ...d, delivery_charge: finalize.money(d.delivery_charge) }))}
            />
            {draftErrorOf("delivery_charge") && (
              <span className="ovx-ferr" aria-live="polite">
                {draftErrorOf("delivery_charge")}
              </span>
            )}
          </div>
        ) : (
          showAmount(r.delivery_charge)
        ),
    },
    {
      name: "Min order (₹)",
      selector: (r) => Number(r.min_order_amount ?? 0),
      sortable: true,
      cell: (r) =>
        editId === r.id ? (
          <div className="ovx-cellfield">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={9}
              placeholder="Default"
              aria-label="Minimum order"
              aria-invalid={draftErrorOf("min_order_amount") ? "true" : undefined}
              className={`ovx-input ovx-sm${draftErrorOf("min_order_amount") ? " ovx-invalid" : ""}`}
              value={draft.min_order_amount}
              onChange={changeDraft("min_order_amount")}
              onBlur={() => setDraft((d) => ({ ...d, min_order_amount: finalize.money(d.min_order_amount) }))}
            />
            {draftErrorOf("min_order_amount") && (
              <span className="ovx-ferr" aria-live="polite">
                {draftErrorOf("min_order_amount")}
              </span>
            )}
          </div>
        ) : (
          showAmount(r.min_order_amount)
        ),
    },
    {
      name: "Status",
      width: "130px",
      cell: (r) => (
        <button
          type="button"
          onClick={() => togglePincode(r)}
          disabled={statusBusy === r.id}
          title="Click to toggle"
          style={{
            padding: "3px 12px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            background: r.is_active ? "#dcfce7" : "#f1f5f9",
            color: r.is_active ? "#15803d" : "#64748b",
          }}
        >
          {r.is_active ? "Active" : "Inactive"}
        </button>
      ),
    },
    {
      name: "Actions",
      right: true,
      width: "240px",
      cell: (r) =>
        editId === r.id ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="ovx-btn ovx-btn-primary ovx-btn-sm"
              disabled={rowSaving}
              onClick={() => saveEdit(r)}
            >
              {rowSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="ovx-btn ovx-btn-outline ovx-btn-sm"
              disabled={rowSaving}
              onClick={() => setEditId(null)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ovx-btn ovx-btn-edit ovx-btn-sm" onClick={() => startEdit(r)}>
              <IconEdit />
            </button>
            <button type="button" className="ovx-btn ovx-btn-del ovx-btn-sm" onClick={() => deletePincode(r)}>
              <IconTrash /> 
            </button>
          </div>
        ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="ovx">
            <style>{`${ONLINE_CSS}\n${TIME_PICKER_CSS}\n${VALIDATION_CSS}\n${BRANCH_CSS}`}</style>

            <div className="ovx-head">
              <div className="ovx-titlewrap">
                <span className="ovx-bar" />
                <div>
                  <h3 className="ovx-title">Online store settings</h3>
                  <p className="ovx-sub">
                    {storeName
                      ? `Control how ${storeName} appears and delivers on the online store.`
                      : "Control how your store appears and delivers on the online store."}
                  </p>
                </div>
              </div>
              <nav className="ovx-crumb">
                <span>Dashboard</span>
                <span>&rsaquo;</span>
                <span className="ovx-muted">Online Settings</span>
              </nav>
            </div>

            {role !== "admin" ? (
              <p className="ovx-card">Only the store admin can change online store settings.</p>
            ) : loading ? (
              <p className="ovx-center">Loading...</p>
            ) : loadError ? (
              <p className="ovx-alert ovx-alert-err">{loadError}</p>
            ) : (
              <>
                <form onSubmit={save} noValidate>
                  <Card
                    title="Online store"
                    hint="Turn this off to hide all your branches from the online store."
                  >
                    <Toggle
                      checked={form.is_online_enabled}
                      onChange={setBool("is_online_enabled")}
                      label={form.is_online_enabled ? "Online store is ON" : "Online store is OFF"}
                      hint="Customers can find your branches and place orders when this is on."
                    />
                  </Card>

                  {listings.length > 1 && (
                    <Card
                      title="Branch status"
                      hint="Open or close each branch separately. A closed branch is hidden from customers and cannot take new orders. Orders already placed are not affected. Changes apply immediately."
                    >
                      {!form.is_online_enabled && (
                        <p className="ovx-note">
                          The whole online store is OFF, so no branch is visible to customers, whatever these buttons say.
                        </p>
                      )}
                      {form.is_online_enabled && listings.every((l) => l.online_enabled === false) && (
                        <p className="ovx-note">All branches are closed. Customers cannot see your store right now.</p>
                      )}
                      <ul className="ovx-bstat-list">
                        {listings.map((l) => {
                          const open = l.online_enabled !== false;
                          const busy = branchBusy === l.branch_id;
                          return (
                            <li key={l.branch_id} className={`ovx-bstat ${open ? "is-open" : "is-closed"}`}>
                              <div>
                                <p className="ovx-bstat-name">{l.name}</p>
                                <span className="ovx-bstat-state">
                                  {open ? "Open · taking orders" : "Closed · not taking orders"}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={Boolean(branchBusy)}
                                onClick={() => toggleBranch(l)}
                                aria-label={`${open ? "Close" : "Open"} ${l.name}`}
                                className={`ovx-bstat-btn ${open ? "do-close" : "do-open"}`}
                              >
                                {busy ? "Saving..." : open ? "Close branch" : "Open branch"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  )}

                  <Card title="Store details" hint="Shown to customers on the online store.">
                    <StoreLogoUpload storeName={storeName} />
                    <div className="ovx-grid2">
                      <Field
                        label="Display name"
                        hint="Leave empty to use your store name."
                        error={errorOf("display_name")}
                        count={form.display_name.length}
                        max={LIMITS.displayName.max}
                      >
                        <input
                          id="ovx-f-display_name"
                          className={inputCls("display_name")}
                          value={form.display_name}
                          onChange={change("display_name", sanitize.displayName)}
                          onBlur={blur("display_name", finalize.text)}
                          maxLength={LIMITS.displayName.max}
                          autoComplete="off"
                          aria-invalid={errorOf("display_name") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Store link name"
                        hint="Small letters, numbers and hyphens only. Leave empty to create it automatically."
                        error={errorOf("slug")}
                        count={form.slug.length}
                        max={LIMITS.slug.max}
                      >
                        <input
                          id="ovx-f-slug"
                          className={inputCls("slug")}
                          value={form.slug}
                          onChange={change("slug", sanitize.slug)}
                          onBlur={blur("slug", finalize.slug)}
                          maxLength={LIMITS.slug.max}
                          placeholder="my-store"
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-invalid={errorOf("slug") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Phone"
                        hint="10-digit mobile number (optional)."
                        error={errorOf("phone")}
                      >
                        <input
                          id="ovx-f-phone"
                          className={inputCls("phone")}
                          value={form.phone}
                          onChange={change("phone", sanitize.phone)}
                          onBlur={blur("phone")}
                          maxLength={10}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="9876543210"
                          aria-invalid={errorOf("phone") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Address"
                        hint="Each branch uses its own address when it has one."
                        error={errorOf("address")}
                        count={form.address.length}
                        max={LIMITS.address.max}
                      >
                        <input
                          id="ovx-f-address"
                          className={inputCls("address")}
                          value={form.address}
                          onChange={change("address", sanitize.address)}
                          onBlur={blur("address", finalize.text)}
                          maxLength={LIMITS.address.max}
                          autoComplete="off"
                          aria-invalid={errorOf("address") ? "true" : undefined}
                        />
                      </Field>
                    </div>
                    <div className="ovx-mt">
                      <Field
                        label="About the store"
                        hint="A short description (optional). One paragraph, no links."
                        error={errorOf("about")}
                        count={form.about.length}
                        max={LIMITS.about.max}
                      >
                        <textarea
                          id="ovx-f-about"
                          className={inputCls("about")}
                          rows={4}
                          maxLength={LIMITS.about.max}
                          value={form.about}
                          onChange={change("about", sanitize.about)}
                          onBlur={blur("about", finalize.text)}
                          aria-invalid={errorOf("about") ? "true" : undefined}
                        />
                      </Field>
                    </div>
                  </Card>


                  <div className="ovx-pair">
                    <Card
                      title="Timings"
                      hint="Orders are accepted only between these times. Leave both empty for always open."
                    >
                      <div className="ovx-grid2">
                        <Field label="Opens at" error={errorOf("open_time")}>
                          <TimePicker
                            id="ovx-f-open_time"
                            invalid={!!errorOf("open_time")}
                            label="Opening time"
                            value={form.open_time}
                            onChange={changeTime("open_time")}
                          />
                        </Field>
                        <Field label="Closes at" error={errorOf("close_time")}>
                          <TimePicker
                            id="ovx-f-close_time"
                            invalid={!!errorOf("close_time")}
                            label="Closing time"
                            value={form.close_time}
                            onChange={changeTime("close_time")}
                          />
                        </Field>
                      </div>
                    </Card>

                    <Card
                      title="Stock kept for online orders"
                      hint="Customers can order only this share of each product's shelf stock. The rest stays for the counter."
                    >
                      <Field
                        label="Online stock share (%)"
                        required
                        hint="Whole number from 0 to 100. Example: 50% of 11 pieces means 5 pieces can be ordered online."
                        error={errorOf("online_stock_percent")}
                      >
                        <input
                          id="ovx-f-online_stock_percent"
                          className={inputCls("online_stock_percent")}
                          value={form.online_stock_percent}
                          onChange={change("online_stock_percent", sanitize.whole(3))}
                          onBlur={blur("online_stock_percent")}
                          inputMode="numeric"
                          maxLength={3}
                          autoComplete="off"
                          aria-invalid={errorOf("online_stock_percent") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Max quantity per product (per order)"
                        hint="Whole number from 1 to 10,000. Default for every product. Leave empty for no limit. You can set a different limit for a product below."
                        error={errorOf("max_qty_per_product")}
                      >
                        <input
                          id="ovx-f-max_qty_per_product"
                          className={inputCls("max_qty_per_product")}
                          value={form.max_qty_per_product}
                          onChange={change("max_qty_per_product", sanitize.whole(5))}
                          onBlur={blur("max_qty_per_product")}
                          inputMode="numeric"
                          maxLength={5}
                          autoComplete="off"
                          placeholder="No limit"
                          aria-invalid={errorOf("max_qty_per_product") ? "true" : undefined}
                        />
                      </Field>
                    </Card>
                  </div>

                  <Card title="Delivery and pickup" hint="Choose how customers get their orders and what it costs.">
                    <div className="ovx-grid2">
                      <Toggle
                        checked={form.accepts_delivery}
                        onChange={setBool("accepts_delivery")}
                        label="Home delivery"
                        hint="Only to the pincodes listed below."
                      />
                      <Toggle
                        checked={form.accepts_pickup}
                        onChange={setBool("accepts_pickup")}
                        label="Pickup from store"
                        hint="Customer collects and pays at the store."
                      />
                    </div>
                    {errorOf("delivery_mode") && (
                      <p id="ovx-f-delivery_mode" tabIndex={-1} className="ovx-ferr" aria-live="polite">
                        {errorOf("delivery_mode")}
                      </p>
                    )}
                    <div className="ovx-grid4 ovx-mt">
                      <Field
                        label="Delivery charge (₹)"
                        required
                        hint="Used for pincodes that have no charge of their own. Enter 0 for free."
                        error={errorOf("delivery_charge")}
                      >
                        <input
                          id="ovx-f-delivery_charge"
                          className={inputCls("delivery_charge")}
                          value={form.delivery_charge}
                          onChange={change("delivery_charge", sanitize.money(6))}
                          onBlur={blur("delivery_charge", finalize.money)}
                          inputMode="decimal"
                          maxLength={9}
                          autoComplete="off"
                          aria-invalid={errorOf("delivery_charge") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Free delivery above (₹)"
                        hint="Leave empty for no free delivery."
                        error={errorOf("free_delivery_above")}
                      >
                        <input
                          id="ovx-f-free_delivery_above"
                          className={inputCls("free_delivery_above")}
                          value={form.free_delivery_above}
                          onChange={change("free_delivery_above", sanitize.money(7))}
                          onBlur={blur("free_delivery_above", finalize.money)}
                          inputMode="decimal"
                          maxLength={10}
                          autoComplete="off"
                          placeholder="No free delivery"
                          aria-invalid={errorOf("free_delivery_above") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Minimum order (₹)"
                        required
                        hint="Minimum amount for home delivery. Enter 0 for none."
                        error={errorOf("min_order_amount")}
                      >
                        <input
                          id="ovx-f-min_order_amount"
                          className={inputCls("min_order_amount")}
                          value={form.min_order_amount}
                          onChange={change("min_order_amount", sanitize.money(6))}
                          onBlur={blur("min_order_amount", finalize.money)}
                          inputMode="decimal"
                          maxLength={9}
                          autoComplete="off"
                          aria-invalid={errorOf("min_order_amount") ? "true" : undefined}
                        />
                      </Field>
                      <Field
                        label="Prepare time (min)"
                        required
                        hint="Time to prepare an order (1 to 1440 minutes)."
                        error={errorOf("prep_minutes")}
                      >
                        <input
                          id="ovx-f-prep_minutes"
                          className={inputCls("prep_minutes")}
                          value={form.prep_minutes}
                          onChange={change("prep_minutes", sanitize.whole(4))}
                          onBlur={blur("prep_minutes")}
                          inputMode="numeric"
                          maxLength={4}
                          autoComplete="off"
                          aria-invalid={errorOf("prep_minutes") ? "true" : undefined}
                        />
                      </Field>
                    </div>
                  </Card>

                  {formError && <p className="ovx-alert ovx-alert-err">{formError}</p>}

                  <div className="ovx-actions">
                    <button type="submit" disabled={saving} className="ovx-btn ovx-btn-primary">
                      {saving ? "Saving..." : "Save settings"}
                    </button>
                  </div>
                </form>

                <Card
                  title="Delivery areas (pincodes)"
                  hint="Customers get home delivery only at these pincodes. A charge or minimum order left empty uses the store default."
                >
                  <div className="ovx-box">
                    <Field
                      label="Add pincodes"
                      required
                      hint="Type or paste many, separated by commas, spaces or new lines. Each must be 6 digits (up to 200 at a time)."
                      error={pinErrorOf("pins")}
                    >
                      <textarea
                        id="ovx-p-pins"
                        className={pinCls("pins")}
                        rows={2}
                        maxLength={LIMITS.pincodeText}
                        value={pins}
                        onChange={changePin("pins", setPins, sanitize.pincodes)}
                        onBlur={blurPin("pins")}
                        placeholder="380001, 380015, 380054"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-invalid={pinErrorOf("pins") ? "true" : undefined}
                      />
                    </Field>
                    <div className="ovx-grid3 ovx-mt">
                      <Field label="Delivery charge (₹)" error={pinErrorOf("charge")}>
                        <input
                          id="ovx-p-charge"
                          className={pinCls("charge")}
                          value={pinCharge}
                          onChange={changePin("charge", setPinCharge, sanitize.money(6))}
                          onBlur={blurPin("charge", setPinCharge, finalize.money)}
                          inputMode="decimal"
                          maxLength={9}
                          autoComplete="off"
                          placeholder="Store default"
                          aria-invalid={pinErrorOf("charge") ? "true" : undefined}
                        />
                      </Field>
                      <Field label="Minimum order (₹)" error={pinErrorOf("min")}>
                        <input
                          id="ovx-p-min"
                          className={pinCls("min")}
                          value={pinMin}
                          onChange={changePin("min", setPinMin, sanitize.money(6))}
                          onBlur={blurPin("min", setPinMin, finalize.money)}
                          inputMode="decimal"
                          maxLength={9}
                          autoComplete="off"
                          placeholder="Store default"
                          aria-invalid={pinErrorOf("min") ? "true" : undefined}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={addPincodes}
                        disabled={adding}
                        className="ovx-btn ovx-btn-primary ovx-btn-full"
                      >
                        {adding ? "Adding..." : "Add pincodes"}
                      </button>
                    </div>
                  </div>

                  {pincodes.length === 0 ? (
                    <p className="ovx-alert ovx-alert-warn ovx-mt">
                      No delivery areas yet. Customers can only choose pickup until you add a pincode.
                    </p>
                  ) : (
                    <div className="ovx-mt">
                      <DataTable
                        columns={pincodeColumns}
                        data={pincodes}
                        customStyles={ONLINE_TABLE_STYLES}
                        highlightOnHover
                        responsive
                        pagination={pincodes.length > 10}
                      />
                    </div>
                  )}
                </Card>

                <OnlineProductLimits defaultLimit={form.max_qty_per_product} />

                {listings.length > 0 && (
                  <Card
                    title="Online store links"
                    hint="Every branch has its own page on the online store. Share these links or make a QR code from them."
                  >
                    <ul className="ovx-list">
                      {listings.map((l) => {
                        const url = `${STOREFRONT_URL}/s/${l.slug}`;
                        const on = l.online_enabled !== false;
                        return (
                          <li key={l.branch_id} className={on ? "" : "is-off"}>
                            <div style={{ minWidth: 0 }}>
                              <p className="ovx-list-name">{l.name}</p>
                              <a href={url} target="_blank" rel="noreferrer">
                                {url}
                              </a>
                            </div>
                            <button type="button" onClick={() => copy(url)} className="ovx-btn ovx-btn-outline ovx-btn-sm">
                              Copy link
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}