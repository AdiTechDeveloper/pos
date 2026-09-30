const SKIP_TYPES = new Set([
  "password",
  "email",
  "url",
  "number",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "color",
  "file",
  "range",
  "checkbox",
  "radio",
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
]);

const SKIP_NAMES = new Set([
  "username",
  "user_name",
  "admin_username",
  "email",
  "password",
  "password_confirmation",
  "current_password",
  "new_password",
  "master_key",
  "pin",
  "token",
  "url",
  "website",
]);

const shouldSkip = (el) => {
  if (el.closest && el.closest("[data-no-uppercase]")) return true;

  if (el.tagName === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (SKIP_TYPES.has(type)) return true;
  }

  const key = (el.name || el.id || "").toLowerCase();
  if (SKIP_NAMES.has(key)) return true;

  return false;
};

const handleInput = (e) => {
  const el = e.target;
  if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;

  if (e.isComposing) return;

  if (shouldSkip(el)) return;

  const value = el.value;
  const upper = value.toUpperCase();
  if (value === upper) return;

  const start = el.selectionStart;
  const end = el.selectionEnd;

  const proto =
    el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (!setter) return;

  setter.call(el, upper);

  try {
    if (start !== null && end !== null) el.setSelectionRange(start, end);
  } catch (err) {}
};

if (typeof window !== "undefined" && !window.__forceUppercaseInstalled) {
  window.__forceUppercaseInstalled = true;
  document.addEventListener("input", handleInput, true);
}
