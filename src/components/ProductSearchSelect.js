import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const PAGE_SIZE = 30;
const MENU_MAX_HEIGHT = 320;
const MENU_MIN_WIDTH = 360;
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const readToken = () => {
  try {
    return JSON.parse(localStorage.getItem("user_detail"))?.token;
  } catch {
    return null;
  }
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Search term ko result me bold dikhata hai
function Highlight({ text, term }) {
  const str = String(text ?? "");
  if (!term) return str;
  const parts = str.split(new RegExp(`(${escapeRegExp(term)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <strong key={i} style={{ color: "#2f4ca2", fontWeight: 700 }}>
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export default function ProductSearchSelect({
  value, // selected product_id (string)
  selectedProduct, // selected product object (label dikhane ke liye)
  onSelect, // (product) => void
  onAddNew, // () => void
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [dirty, setDirty] = useState(false); // user ne khud type kiya?
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const abortRef = useRef(null);
  const listId = useRef(`psel-${Math.random().toString(36).slice(2, 9)}`).current;

  const query = dirty ? term.trim() : "";

  /* ---------- menu position (fixed => scroll container clip nahi karega) ---------- */
  const updatePosition = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, MENU_MIN_WIDTH);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_MAX_HEIGHT && rect.top > spaceBelow;

    setMenuStyle({
      position: "fixed",
      left,
      width,
      zIndex: 10000,
      maxHeight: MENU_MAX_HEIGHT,
      overflowY: "auto",
      background: "#fff",
      border: "1px solid #b7c5d2",
      borderRadius: 10,
      boxShadow: "0 12px 32px rgba(15, 27, 46, 0.16)",
      fontFamily: FONT,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  /* ---------- server search (debounced, purani request cancel) ---------- */
  useEffect(() => {
    if (!open) return;

    const delay = dirty ? 250 : 0;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setFailed(false);
      try {
        const res = await axios.get(`${BASE_URL}/api/all-products`, {
          params: { search: query, per_page: PAGE_SIZE, page: 1 },
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${readToken()}`,
          },
          signal: controller.signal,
        });
        setResults(res.data?.products || []);
        setLoading(false);
      } catch (e) {
        if (axios.isCancel?.(e) || e?.code === "ERR_CANCELED") return;
        setResults([]);
        setFailed(true);
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, open, dirty, retryTick]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // naye results aaye to pehla item highlight
  useEffect(() => {
    setActiveIndex(results.length ? 0 : -1);
  }, [results]);

  // keyboard se chalte waqt active item dikhta rahe
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document
      .getElementById(`${listId}-opt-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  /* ---------- actions ---------- */
  const closeMenu = () => {
    abortRef.current?.abort();
    setOpen(false);
    setDirty(false);
    setLoading(false);
  };

  const choose = (product) => {
    onSelect(product);
    closeMenu();
    // billing flow: product chunte hi cursor Qty par
    setTimeout(() => {
      wrapRef.current
        ?.closest(".pb-line-row")
        ?.querySelector('input[type="number"]')
        ?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (open) {
          // form ka "Enter = next field" yahan na chale
          e.preventDefault();
          e.stopPropagation();
          if (results[activeIndex]) choose(results[activeIndex]);
        }
        break;
      case "Escape":
        if (open) {
          e.stopPropagation();
          closeMenu();
        }
        break;
      default:
    }
  };

  /* ---------- menu ---------- */
  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        id={listId}
        role="listbox"
        style={menuStyle}
        // input ka focus na jaaye (warna blur se menu band ho jaata hai)
        onMouseDown={(e) => e.preventDefault()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "#fff",
            borderBottom: "1px solid #e3e9ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
          }}
        >
          <span
            role="button"
            tabIndex={-1}
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#3563c7",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              closeMenu();
              onAddNew?.();
            }}
          >
            + Add New Product
          </span>
          <span style={{ fontSize: 11.5, color: "#8A8170" }}>
            {loading ? "Searching…" : `${results.length} found`}
          </span>
        </div>

        {failed && (
          <div style={{ padding: "14px 12px", fontSize: 13, color: "#D1655A" }}>
            Could not load products.{" "}
            <span
              role="button"
              style={{ color: "#3563c7", fontWeight: 600, cursor: "pointer" }}
              onMouseDown={(e) => {
                e.preventDefault();
                setRetryTick((n) => n + 1);
              }}
            >
              Retry
            </span>
          </div>
        )}

        {!failed && !loading && results.length === 0 && (
          <div style={{ padding: "14px 12px", fontSize: 13, color: "#8A8170" }}>
            {query ? `No products found for “${query}”` : "No products yet"}
          </div>
        )}

        {results.map((p, i) => {
          const isActive = i === activeIndex;
          const isSelected = String(p.id) === String(value);
          const meta = [
            p.sku,
            p.brand?.name,
            p.total_stock != null ? `Stock: ${Number(p.total_stock)}` : null,
          ]
            .filter(Boolean)
            .join("  ·  ");

          return (
            <div
              key={p.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={isSelected}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: isActive ? "#eaf1fb" : "#fff",
                boxShadow: isSelected ? "inset 3px 0 0 #3894da" : "none",
                borderBottom: "1px solid #f1f4f8",
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#3D3527",
                  lineHeight: 1.35,
                }}
              >
                <Highlight text={p.name} term={query} />
              </div>
              {meta && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#8A8170",
                    marginTop: 1,
                    lineHeight: 1.3,
                  }}
                >
                  {meta}
                </div>
              )}
            </div>
          );
        })}

        {results.length >= PAGE_SIZE && (
          <div
            style={{
              padding: "8px 12px",
              fontSize: 11.5,
              color: "#8A8170",
              textAlign: "center",
              background: "#f8fafc",
            }}
          >
            Showing first {PAGE_SIZE} — type more to narrow down
          </div>
        )}
      </div>
    ) : null;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        placeholder="Search product…"
        title={selectedProduct?.name || ""}
        value={open ? term : selectedProduct?.name || ""}
        style={{ paddingRight: 28, textOverflow: "ellipsis" }}
        onFocus={(e) => {
          const el = e.target;
          setOpen(true);
          setDirty(false);
          // selected naam edit ke liye ready; type karte hi replace ho jaata hai
          setTerm(selectedProduct?.name || "");
          setTimeout(() => el.select(), 0);
        }}
        onBlur={closeMenu}
        onChange={(e) => {
          setTerm(e.target.value);
          setDirty(true);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />

      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          transition: "transform 0.15s",
          pointerEvents: "none",
          color: "#8A8170",
        }}
      >
        <path
          d="M2 4l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {menu && createPortal(menu, document.body)}
    </div>
  );
}