import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Layout from "./layout";
import { getAiInsightBranches } from "../utils/api";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { getAiChatCache, setAiChatCache } from "../utils/aiChatCache";

/* ───────────── Constants ───────────── */
const MAX_WORDS = 100;
const MIN_CHARS = 2;
const MAX_CHARS = 1500;
const SEND_COOLDOWN_MS = 1500;
const DUPLICATE_WINDOW_MS = 15000;
const TA_MIN = 26;
const TA_MAX = 160;
const AVATAR = "./avatar.png";
const DAY_MS = 24 * 60 * 60 * 1000;

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Kisi bhi reason se (internal/external) fail hone par yahi normal text dikhega, red error nahi.
const FALLBACK_REPLY =
  "Abhi main aapke sawal ka jawab nahi de paa raha. Kripya thodi der baad dobara try karein.";

/* Sales report ka apna endpoint hai, baaki sab reports generic endpoint se download hoti hain.
   Backend `download.report_type` bhejta hai. */
const SALES_ENDPOINT = "/api/reports/ai-sales-download";
const GENERIC_ENDPOINT = "/api/reports/ai-report-download";

const REPORT_LABELS = {
  sales: "Sales Report",
  inventory: "Stock Report",
  low_stock: "Low Stock Report",
  out_of_stock: "Out of Stock Report",
  supplier_dues: "Supplier Dues Report",
  top_selling: "Top Selling Products Report",
  purchase_suggestions: "Purchase Suggestions Report",
  product_profit: "Profit Report",
  branch_comparison: "Branch Comparison Report",
  purchase_report: "Purchase Report",
};

// report_type na ho (ya purani saved chats) toh "sales" maana jayega.
const getReportMeta = (download = {}) => {
  const type = download.report_type || download.type;
  const customLabel = download.label || download.title;
  if (!type || type === "sales") {
    return { type: "sales", label: customLabel || REPORT_LABELS.sales, endpoint: SALES_ENDPOINT, isGeneric: false };
  }
  return {
    type,
    label: customLabel || REPORT_LABELS[type] || "Report",
    endpoint: GENERIC_ENDPOINT,
    isGeneric: true,
  };
};

/* ───────────── Helpers ───────────── */
const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem("user_detail") || "{}") || {};
  } catch {
    return {};
  }
};

const countWords = (text) => (text.trim().match(/\S+/g) || []).length;

const truncateWords = (text, max) => {
  const re = /\S+/g;
  let count = 0;
  let match;
  while ((match = re.exec(text))) {
    count += 1;
    if (count === max) return text.slice(0, match.index + match[0].length);
  }
  return text;
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const mapConversation = (conversation) => ({
  id: Number(conversation.id),
  title: conversation.title || "New chat",
  branchId: conversation.branch_id == null ? null : String(conversation.branch_id),
  messages: [],
  updatedAt:
    conversation.last_message_at ||
    conversation.updated_at ||
    conversation.created_at ||
    new Date().toISOString(),
});

const mapConversationMessages = (conversation) => ({
  ...mapConversation(conversation),
  loaded: true, // messages are fully loaded, no need to fetch this chat again
  messages: (conversation.messages || []).map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content || "",
    time: formatTime(message.created_at || new Date()),
    ...(message.metadata?.download ? { download: message.metadata.download } : {}),
    ...(message.metadata?.data ? { data: message.metadata.data } : {}),
  })),
});

const createChat = (branchId = null) => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "New chat",
  branchId,
  messages: [],
  loaded: true,
  updatedAt: new Date().toISOString(),
});

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(pointer: coarse)").matches;

const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const groupChats = (chats) => {
  const today = startOfDay(new Date());
  const groups = { Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  [...chats]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach((chat) => {
      const t = startOfDay(chat.updatedAt);
      if (t >= today) groups.Today.push(chat);
      else if (t >= today - DAY_MS) groups.Yesterday.push(chat);
      else if (t >= today - 7 * DAY_MS) groups["Previous 7 days"].push(chat);
      else groups.Older.push(chat);
    });
  return Object.entries(groups).filter(([, list]) => list.length > 0);
};

const getTopOffset = (target) => {
  let top = Math.max(target.getBoundingClientRect().top, 0);
  const right = document.querySelector(".section-content-right");
  if (!right) return top;
  const first = right.firstElementChild;
  if (first && first !== target) {
    top = Math.max(top, first.getBoundingClientRect().bottom);
  }
  right.querySelectorAll(":scope > *, :scope > * > *").forEach((el) => {
    if (el === target || target.contains(el)) return;
    const pos = window.getComputedStyle(el).position;
    if (pos === "fixed" || pos === "sticky") {
      const b = el.getBoundingClientRect();
      if (b.top <= 4 && b.height > 30 && b.height < 250 && b.width > 300) {
        top = Math.max(top, b.bottom);
      }
    }
  });
  return top;
};

const getLeftOffset = (target) => {
  let left = Math.max(target.getBoundingClientRect().left, 0);
  const right = document.querySelector(".section-content-right");
  if (right) left = Math.max(left, right.getBoundingClientRect().left);
  const wrap = document.querySelector(".layout-wrap");
  if (wrap) {
    wrap.querySelectorAll(":scope > *, :scope > * > *").forEach((el) => {
      if (el === right || el.contains(target) || target.contains(el)) return;
      const b = el.getBoundingClientRect();
      const pos = window.getComputedStyle(el).position;
      const isSideColumn =
        b.left <= 4 &&
        b.width > 60 &&
        b.width < window.innerWidth * 0.5 &&
        b.height > window.innerHeight * 0.5;
      if (isSideColumn && ["fixed", "sticky", "static", "relative"].includes(pos)) {
        left = Math.max(left, b.right);
      }
    });
  }
  return left;
};

/* ───────────── Markdown ───────────── */
const FormattedText = ({ text }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      table: ({ children }) => (
        <div className="aic-table-wrap">
          <table className="aic-table">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="aic-table-head">{children}</thead>,
      th: ({ children, style }) => <th className="aic-table-th" style={style}>{children}</th>,
      td: ({ children, style }) => <td className="aic-table-td" style={style}>{children}</td>,
      tr: ({ children }) => <tr className="aic-table-row">{children}</tr>,
      p: ({ children }) => <p className="aic-p">{children}</p>,
      ul: ({ children }) => <ul className="aic-md-list">{children}</ul>,
      ol: ({ children }) => <ol className="aic-md-list">{children}</ol>,
      li: ({ children }) => <li>{children}</li>,
      strong: ({ children }) => <strong>{children}</strong>,
      h1: ({ children }) => <h3 className="aic-md-heading">{children}</h3>,
      h2: ({ children }) => <h3 className="aic-md-heading">{children}</h3>,
      h3: ({ children }) => <h4 className="aic-md-heading">{children}</h4>,
      code: ({ children }) => <code className="aic-md-code">{children}</code>,
    }}
  >
    {text || ""}
  </ReactMarkdown>
);

/* ───────────── Icons ───────────── */
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const HistoryIcon = () => (
  <Svg>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
const PlusIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
const CloseIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
const DeleteIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5M14 11v5" />
  </Svg>
);
const SendIcon = () => (
  <Svg>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);
const CopyIcon = () => (
  <Svg size={13}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Svg>
);

/* ───────────── Message rows ───────────── */
function MessageRow({ message, onDownload }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (message.role === "user") {
    return (
      <div className="aic-user">
        <div className="aic-ubub">{message.content}</div>
      </div>
    );
  }

  const download = message.download;
  const showCopy = !message.isError && !message.isNotice;

  return (
    <div className="aic-ai">
      <div className="aic-spark">
        <img src={AVATAR} alt="AI Assistant" />
      </div>
      <div className="aic-aibody">
        {message.isError ? (
          <div className="aic-err">{message.content}</div>
        ) : (
          <div className="aic-aitext">
            <FormattedText text={message.content} />
          </div>
        )}

        {!message.isError && download?.date_from && download?.date_to && (
          <button
            type="button"
            className="aic-download-btn"
            onClick={() => onDownload(download)}
          >
            ↓ Download {getReportMeta(download).label} (
            {download.format === "excel" ? "Excel" : "PDF"})
          </button>
        )}

        <div className="aic-actions">
          {showCopy && (
            <button type="button" onClick={handleCopy} className="aic-copy">
              <CopyIcon />
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <span>{message.time}</span>
        </div>
      </div>
    </div>
  );
}

function TypingRow() {
  return (
    <div className="aic-ai">
      <div className="aic-spark">
        <img src={AVATAR} alt="AI Assistant" />
      </div>
      <div className="aic-typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}



const QUICK_PROMPTS = [
  { icon: "📊", title: "Sales performance", prompt: "How much did my business sell today?" },
  { icon: "📦", title: "Stock analysis", prompt: "Which products are running low on stock?" },
  { icon: "💰", title: "Profit analysis", prompt: "Analyze my business profit for this month." },
  { icon: "💡", title: "Business suggestions", prompt: "What should I do to improve my business?" },
  { icon: "🛒", title: "Purchase Suggestion", prompt: "Purchase suggestion batao, kya reorder karna chahiye" },
  { icon: "👥", title: "Customer Analysis", prompt: "Customer analysis batao, top customers aur repeat customers" },
  { icon: "🕐", title: "Time-wise Sales", prompt: "Aaj ka time wise sales analysis batao, kis time sabse zyada sale aur customers aate hain" },
  { icon: "⏳", title: "Expiry Analysis", prompt: "Expiry analysis batao, kaunsa stock jaldi expire hone wala hai" },
  { icon: "💳", title: "Customer Wallet", prompt: "Customers ka wallet balance batao" },
];
/* ───────────── Styles ───────────── */
const CSS = `
.aic-panel, .aic-panel * { box-sizing: border-box; }
.aic-panel {
  --ink: #1f2328; --muted: #6b7280; --faint: #9aa0a8; --line: #ececf0; --soft: #f5f5f8; --accent: #4f46e5;
  position: fixed; z-index: 10; display: flex; overflow: hidden;
  background: #fff; color: var(--ink);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  font-size: 15px; line-height: 1.5; letter-spacing: normal;
}
.aic-panel * { text-transform: none !important; letter-spacing: normal; }
.aic-panel button, .aic-panel select, .aic-panel textarea {
  font-family: inherit; min-width: 0; min-height: 0; margin: 0; box-shadow: none; text-shadow: none;
}
.aic-panel button { cursor: pointer; }
.aic-panel svg { display: block; flex-shrink: 0; fill: none !important; overflow: visible; }
.aic-panel svg path, .aic-panel svg rect, .aic-panel svg circle { fill: none !important; stroke: currentColor !important; }
.aic-panel .aic-send svg, .aic-panel .aic-iconbtn svg { width: 18px !important; height: 18px !important; }
.aic-panel .aic-scroll, .aic-panel .aic-list { scrollbar-width: thin; scrollbar-color: #d9d9df transparent; }
.aic-panel img { max-width: 100%; }

.aic-panel .aic-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #fff; }
.aic-panel .aic-top { height: 64px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 20px; border-bottom: 1px solid var(--line); }
.aic-panel .aic-top-left, .aic-panel .aic-top-right { display: flex; align-items: center; gap: 10px; min-width: 0; }
.aic-panel .aic-logo { width: 40px; height: 40px; border-radius: 10px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.aic-panel .aic-logo img, .aic-panel .aic-hero img, .aic-panel .aic-spark img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.aic-panel .aic-title { font-size: 17px; font-weight: 600; white-space: nowrap; }
.aic-panel .aic-select { height: 36px; max-width: 220px; padding: 0 10px; border: 1px solid #e0e0e6; border-radius: 8px; background: #fff; color: var(--ink); font-size: 14px; outline: none; }
.aic-panel .aic-select:focus { border-color: var(--accent); }
.aic-panel .aic-btn { height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; border: 1px solid #e0e0e6; border-radius: 8px; background: #fff; color: #374151; font-size: 14px; font-weight: 500; transition: background .15s; }
.aic-panel .aic-btn:hover { background: var(--soft); }
.aic-panel .aic-btn.on { background: #eef0ff; border-color: #cfd3ff; color: var(--accent); }
.aic-panel .aic-btn svg { width: 16px !important; height: 16px !important; }
.aic-panel .aic-iconbtn { width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 8px; background: transparent; color: #4b5563; display: flex; align-items: center; justify-content: center; }
.aic-panel .aic-iconbtn:hover { background: var(--soft); }

.aic-panel .aic-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 6px 20px 18px; }
.aic-panel .aic-col { width: 100%; max-width: 760px; margin: 0 auto; }
.aic-panel .aic-welcome { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 0; }
.aic-panel .aic-hero { width: 48px; height: 48px; border-radius: 14px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; overflow: hidden; }
.aic-panel .aic-h1 { font-size: 26px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; margin: 0; }
.aic-panel .aic-sub { font-size: 15px; color: var(--muted); margin: 6px 0 22px; }
.aic-panel .aic-chips {
  width: 100%;
  max-width: 760px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 10px;
}
.aic-panel .aic-chip { text-align: left; padding: 14px 14px; border: 1px solid #e6e6ec; border-radius: 12px; background: #fff; color: var(--ink); transition: background .15s, border-color .15s; }
.aic-panel .aic-chip:hover:not(:disabled) { background: #fafafd; border-color: #cfd0f5; }
.aic-panel .aic-chip:disabled { opacity: .5; cursor: not-allowed; }
.aic-panel .aic-chip-title { font-size: 15px; font-weight: 600; }
.aic-panel .aic-chip-text { font-size: 12.5px; color: var(--muted); margin-top: 4px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.aic-panel .aic-user { display: flex; justify-content: flex-end; margin: 18px 0 8px; }
.aic-panel .aic-ubub { max-width: 78%; padding: 10px 16px; border-radius: 16px 16px 4px 16px; background: var(--soft); font-size: 15px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.aic-panel .aic-ai { display: flex; gap: 10px; margin: 12px 0; }
.aic-panel .aic-spark { width: 34px; height: 34px; flex-shrink: 0; margin-top: 1px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.aic-panel .aic-aibody { flex: 1; min-width: 0; }
.aic-panel .aic-aitext { font-size: 15px; line-height: 1.8; color: #2b2f36; min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
.aic-panel .aic-p { margin: 0 0 8px; }
.aic-panel .aic-aitext strong { font-weight: 600; color: #11151a; }
.aic-panel .aic-md-list { margin: 0 0 8px; padding-left: 22px; }
.aic-panel .aic-md-heading { margin: 12px 0 6px; font-size: 16px; font-weight: 600; }
.aic-panel .aic-md-code { padding: 1px 5px; border-radius: 4px; background: var(--soft); font-size: 13px; }
.aic-panel .aic-err { padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--soft); color: var(--ink); font-size: 15px; line-height: 1.7; }
.aic-panel .aic-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--faint); }
.aic-panel .aic-copy { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; margin-left: -6px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 12px; }
.aic-panel .aic-copy:hover { background: var(--soft); color: var(--ink); }
.aic-panel .aic-download-btn { display: inline-flex; margin: 10px 0; padding: 9px 14px; border: 1px solid #c7d2fe; border-radius: 9px; background: #eef2ff; color: #3730a3; font-size: 13px; font-weight: 600; }
.aic-panel .aic-download-btn:hover { background: #e0e7ff; }

.aic-panel .aic-typing { display: flex; align-items: center; gap: 5px; height: 34px; }
.aic-panel .aic-typing span { width: 7px; height: 7px; border-radius: 50%; background: #a5a8f0; animation: aic-bounce 1s infinite ease-in-out; }
.aic-panel .aic-typing span:nth-child(2) { animation-delay: .15s; }
.aic-panel .aic-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes aic-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-4px); opacity: 1; } }

.aic-panel .aic-composer { flex-shrink: 0; padding: 6px 20px 10px; background: #fff; }
.aic-panel .aic-box { width: 100%; max-width: 760px; margin: 0 auto; display: flex; align-items: flex-end; gap: 8px; padding: 6px 6px 6px 14px; border: 1px solid #dcdce3; border-radius: 16px; background: #fff; box-shadow: 0 1px 8px rgba(15, 18, 22, .05); transition: border-color .15s, box-shadow .15s; }
.aic-panel .aic-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79, 70, 229, .1); }
.aic-panel .aic-box.limit { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, .12); }
.aic-panel .aic-textarea {
  flex: 1; width: 100%; display: block; resize: none; border: 0 !important; outline: 0 !important;
  box-shadow: none !important; background: transparent !important; border-radius: 0 !important;
  padding: 4px 0 !important; height: ${TA_MIN}px; min-height: ${TA_MIN}px !important; max-height: ${TA_MAX}px !important;
  font-size: 15px; line-height: 1.6 !important; color: var(--ink) !important;
}
.aic-panel .aic-textarea::placeholder { color: var(--faint); }
.aic-panel .aic-send { width: 36px; height: 36px; flex-shrink: 0; border: 0; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.aic-panel .aic-send:hover:not(:disabled) { background: #4338ca; }
.aic-panel .aic-send:disabled { background: #ececf0; color: #8b9099; cursor: not-allowed; }
.aic-panel .aic-spin { animation: aic-rot .8s linear infinite; }
@keyframes aic-rot { to { transform: rotate(360deg); } }
.aic-panel .aic-meta { width: 100%; max-width: 760px; margin: 6px auto 0; padding: 0 4px; display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--faint); }
.aic-panel .aic-meta .err { color: #b45309; font-weight: 500; }
.aic-panel .aic-count { white-space: nowrap; font-weight: 600; }
.aic-panel .aic-count.warn { color: #d97706; }
.aic-panel .aic-count.max { color: #b45309; }
.aic-panel .aic-note { text-align: center; margin-top: 4px; font-size: 11px; color: #b0b4bb; }

.aic-panel .aic-hist { width: 268px; flex-shrink: 0; display: flex; flex-direction: column; background: #fafafb; border-left: 1px solid var(--line); transition: margin-right .25s ease, transform .25s ease; }
.aic-panel .aic-hist.closed { margin-right: -268px; visibility: hidden; transition: margin-right .25s ease, visibility 0s .25s; }
.aic-panel .aic-hist-top { height: 64px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 14px 0 16px; border-bottom: 1px solid var(--line); }
.aic-panel .aic-hist-title { font-size: 15px; font-weight: 600; }
.aic-panel .aic-newbtn { display: flex; align-items: center; justify-content: center; gap: 6px; width: calc(100% - 24px); margin: 12px; padding: 9px 12px; border: 1px solid #e0e0e6; border-radius: 10px; background: #fff; color: #1f2328; font-size: 14px; font-weight: 500; transition: background .15s; }
.aic-panel .aic-newbtn:hover { background: var(--soft); }
.aic-panel .aic-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 10px; }
.aic-panel .aic-group { padding: 12px 8px 4px; font-size: 12px; font-weight: 600; color: var(--faint); }
.aic-panel .aic-item { display: flex; align-items: center; gap: 2px; padding: 1px 2px 1px 10px; margin-bottom: 1px; border-radius: 8px; cursor: pointer; font-size: 14px; color: #2b2f36; transition: background .12s; }
.aic-panel .aic-item:hover { background: #efeff3; }
.aic-panel .aic-item.active { background: #e9e9ff; color: #3730a3; font-weight: 500; }
.aic-panel .aic-item-title { flex: 1; min-width: 0; padding: 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aic-panel .aic-del { width: 26px; height: 26px; border: 0; border-radius: 6px; background: transparent; color: var(--faint); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .12s; }
.aic-panel .aic-item:hover .aic-del, .aic-panel .aic-item.active .aic-del { opacity: 1; }
.aic-panel .aic-del:hover { background: #fde8e8; color: #dc2626; }
.aic-panel .aic-empty { padding: 28px 14px; text-align: center; font-size: 13px; color: var(--faint); line-height: 1.6; }
.aic-panel .aic-hist-foot { padding: 10px 16px; border-top: 1px solid var(--line); font-size: 12px; color: var(--faint); }
.aic-panel .aic-backdrop { display: none; }

.aic-panel .aic-table-wrap { display: block; width: 100%; max-width: 100%; max-height: 520px; overflow: auto; margin: 14px 0 16px; border: 0; border-radius: 0; background: transparent; scrollbar-width: thin; scrollbar-color: #d4d4dc transparent; -webkit-overflow-scrolling: touch; }
.aic-panel .aic-table { width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: auto; font-size: 14px; line-height: 1.45; color: #0d0d0d; border: none; }
.aic-panel .aic-table-head th { position: sticky; top: 0; z-index: 2; background: #fff; }
.aic-panel .aic-table-th { padding: 10px 14px; text-align: left; font-weight: 600; white-space: nowrap; color: #0d0d0d; border: 0; border-bottom: 1px solid #e3e3e3; }
.aic-panel .aic-table-td { font-size: 13px; padding: 10px 10px; text-align: left; vertical-align: top; white-space: normal; overflow-wrap: break-word; word-break: normal; color: #0d0d0d; border: 0; border-bottom: 1px solid #efefef; }
.aic-panel .aic-table-th:first-child, .aic-panel .aic-table-td:first-child { padding-left: 8px; }
.aic-panel .aic-table-th:last-child, .aic-panel .aic-table-td:last-child { padding-right: 8px; }
.aic-panel .aic-table-row:last-child .aic-table-td { border-bottom: 0; }

@media (max-width: 999px) {
  .aic-panel .aic-hist { position: absolute; z-index: 30; top: 0; bottom: 0; right: 0; width: 280px; max-width: 86%; box-shadow: 0 0 30px rgba(0,0,0,.15); }
  .aic-panel .aic-hist.closed { margin-right: 0; transform: translateX(105%); transition: transform .25s ease, visibility 0s .25s; }
  .aic-panel .aic-backdrop { display: block; position: absolute; inset: 0; z-index: 20; border: 0; background: rgba(15, 18, 22, .35); }
}
@media (max-width: 640px) {
  .aic-panel .aic-top { padding: 0 12px; }
  .aic-panel .aic-chips { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 6px 0; }
  .aic-panel .aic-chip { padding: 12px 8px; text-align: center; }
  .aic-panel .aic-chip-title { font-size: 12.5px; line-height: 1.3; }
  .aic-panel .aic-chip-text { display: none; }
  .aic-panel .aic-scroll { padding: 4px 12px 14px; }
  .aic-panel .aic-composer { padding: 6px 12px 8px; }
  .aic-panel .aic-select { max-width: 150px; }
  .aic-panel .aic-btn-label, .aic-panel .aic-title { display: none; }
  .aic-panel .aic-ubub { max-width: 90%; }
  .aic-panel .aic-table { font-size: 13px; }
  .aic-panel .aic-table-th, .aic-panel .aic-table-td { padding: 10px 10px; }
  .aic-panel .aic-table-td { min-width: 90px; }
}
@media (max-height: 760px) {
  .aic-panel .aic-hero { display: none; }
  .aic-panel .aic-sub { margin-bottom: 16px; }
}
@media (hover: none) { .aic-panel .aic-del { opacity: 1; } }
`;

/* ───────────── Main panel ───────────── */
function ChatPanel() {
  const location = useLocation();

const routeQuestion =
  typeof location.state?.question === "string"
    ? location.state.question
    : "";
  const userData = useMemo(getUserData, []);
  const token = userData.token;

  const [rect, setRect] = useState(null);
  const [branches, setBranches] = useState([]);
  // Chats cached from an earlier visit to this page (null on first visit / expired / other user).
  const [initial] = useState(() => {
    const cached = getAiChatCache();
    if (!cached) return null;
    return {
      ...cached,
      // If the user left while a reply was still pending, the reply was saved on the
      // server but not here, so that chat is fetched again.
      chats: cached.chats.map((chat) => {
        const last = chat.messages[chat.messages.length - 1];
        return last?.role === "user" && !String(chat.id).startsWith("draft-")
          ? { ...chat, loaded: false }
          : chat;
      }),
    };
  });
  const routeAutoSubmit = location.state?.autoSubmit === true;

  const [selectedBranch, setSelectedBranch] = useState(initial?.selectedBranch ?? "");
  const [chats, setChats] = useState(initial?.chats ?? []);
  const [activeChatId, setActiveChatId] = useState(initial?.activeChatId ?? null);
  const [loadingChats, setLoadingChats] = useState(!initial);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(isDesktop);

  const autoSubmittedRef = useRef(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const sendingRef = useRef(false);
  const cacheReadyRef = useRef(false); // true only after chats were loaded successfully
  const lastSendRef = useRef({ time: 0, text: "" });

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const grouped = useMemo(() => groupChats(chats), [chats]);

  const wordCount = countWords(input);
  const atLimit = wordCount >= MAX_WORDS;
  const nearLimit = wordCount >= MAX_WORDS * 0.9;

  const canSend =
    !sending &&
    !loadingBranches &&
    !!selectedBranch &&
    input.trim().length >= MIN_CHARS &&
    wordCount <= MAX_WORDS;

  const LIMIT_MSG = `Word limit reached (${MAX_WORDS}/${MAX_WORDS}). Delete some words to type more.`;

  const authHeaders = { Accept: "application/json", Authorization: `Bearer ${token}` };

  /* Fit the panel inside the app layout */
  useLayoutEffect(() => {
    const target =
      document.querySelector(".main-content") ||
      document.querySelector(".section-content-right");
    if (!target) return undefined;

    const prevOverflow = target.style.overflow;
    const prevBody = document.body.style.overflow;
    target.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const measure = () => {
      const top = getTopOffset(target);
      const left = getLeftOffset(target);
      setRect((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
    };

    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1000);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(target);
    const wrap = document.querySelector(".layout-wrap");
    if (wrap) {
      ro?.observe(wrap);
      if (wrap.firstElementChild) ro?.observe(wrap.firstElementChild);
    }
    window.addEventListener("resize", measure);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      target.style.overflow = prevOverflow;
      document.body.style.overflow = prevBody;
    };
  }, []);

  /* Load saved conversations: from the cache if we have it, otherwise from the server */
  useEffect(() => {
    let mounted = true;

    const loadDetail = async (id) => {
      try {
        const detail = await axios.get(`/api/ai/conversations/${id}`, { headers: authHeaders });
        if (!mounted || !detail.data?.data) return;
        const full = mapConversationMessages(detail.data.data);
        setChats((current) =>
          current.map((chat) => (String(chat.id) === String(id) ? full : chat))
        );
        if (full.branchId) setSelectedBranch((current) => current || full.branchId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Could not load conversation messages:", error);
      }
    };

    const loadConversations = async () => {
      if (!token) {
        setChats([]);
        setActiveChatId(null);
        setLoadingChats(false);
        return;
      }

      setLoadingChats(true);
      try {
        const response = await axios.get("/api/ai/conversations", { headers: authHeaders });
        const payload = response.data?.data;
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        const mapped = list.map(mapConversation);
        if (!mounted) return;

        cacheReadyRef.current = true;
        setChats(mapped);
        const firstId = mapped[0]?.id ?? null;
        setActiveChatId(firstId);

        if (firstId != null) await loadDetail(firstId);
      } catch (error) {
        // Silent: history khali dikhegi, koi red error nahi. Cache nahi banega, agli baar dobara try hoga.
        // eslint-disable-next-line no-console
        console.error("Could not load chat history:", error);
      } finally {
        if (mounted) setLoadingChats(false);
      }
    };

    if (initial) {
      // Cache hit: no list request. Only re-fetch the open chat if it is incomplete.
      cacheReadyRef.current = true;
      const active = initial.chats.find((chat) => String(chat.id) === String(initial.activeChatId));
      if (active && !active.loaded && !String(active.id).startsWith("draft-")) {
        loadDetail(active.id);
      }
    } else {
      loadConversations();
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* Keep the cache in sync, so coming back to this page does not hit the database again */
  useEffect(() => {
    if (loadingChats || !cacheReadyRef.current) return;
    setAiChatCache({ chats, activeChatId, selectedBranch });
  }, [chats, activeChatId, selectedBranch, loadingChats]);

  /* Load branches */
  useEffect(() => {
    let mounted = true;
    const loadBranches = async () => {
      try {
        const res = await getAiInsightBranches(token);
        const list = res.data?.branches || [];
        if (!mounted) return;
        setBranches(list);
        setSelectedBranch((current) =>
          current && list.some((b) => String(b.id) === String(current))
            ? current
            : list.length > 0
              ? String(list[0].id)
              : ""
        );
      } catch {
        /* silent: dropdown "No branches" dikha dega */
      } finally {
        if (mounted) setLoadingBranches(false);
      }
    };
    loadBranches();
    return () => {
      mounted = false;
    };
  }, [token]);

  /* Scroll behaviour */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeChat?.messages, sending]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [activeChatId, rect]);

  /* Auto-grow textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.setProperty("height", `${TA_MIN}px`, "important");
    el.style.setProperty(
      "height",
      `${Math.min(Math.max(el.scrollHeight, TA_MIN), TA_MAX)}px`,
      "important"
    );
  }, [input, rect]);

  const updateChat = (chatId, updater) =>
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? updater(chat) : chat)));

  const focusInput = () => setTimeout(() => textareaRef.current?.focus(), 50);

useEffect(() => {
  if (!routeAutoSubmit || !routeQuestion.trim()) return;

  const submitKey = location.key || routeQuestion;

  // Same navigation par duplicate request mat bhejo
  if (autoSubmittedRef.current === submitKey) return;

  // Branch aur existing chat load hone ka wait karo
  if (loadingBranches || loadingChats || !selectedBranch || sending) {
    return;
  }

  autoSubmittedRef.current = submitKey;

  setInput(routeQuestion);
  setInputError("");

  const timer = window.setTimeout(() => {
    handleSend(routeQuestion);
  }, 0);

  return () => window.clearTimeout(timer);
}, [
  routeAutoSubmit,
  routeQuestion,
  location.key,
  loadingBranches,
  loadingChats,
  selectedBranch,
  sending,
]);

  const closeHistoryOnMobile = () => {
    if (!isDesktop()) setHistoryOpen(false);
  };

  const handleNewChat = () => {
    if (activeChat && activeChat.messages.length === 0) {
      closeHistoryOnMobile();
      focusInput();
      return;
    }
    const chat = createChat(selectedBranch || null);
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setInput("");
    setInputError("");
    closeHistoryOnMobile();
    focusInput();
  };

  const handleSelectChat = async (chatId) => {
    const chat = chats.find((item) => String(item.id) === String(chatId));
    setActiveChatId(chatId);
    setInput("");
    setInputError("");
    if (chat?.branchId) setSelectedBranch(String(chat.branchId));
    closeHistoryOnMobile();

    if (String(chatId).startsWith("draft-") || !token || chat?.loaded) return;

    try {
      const response = await axios.get(`/api/ai/conversations/${chatId}`, { headers: authHeaders });
      if (response.data?.data) {
        const full = mapConversationMessages(response.data.data);
        setChats((current) =>
          current.map((item) => (String(item.id) === String(chatId) ? full : item))
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Could not load conversation:", error);
      toast.info("Yeh conversation abhi load nahi ho paayi. Kripya dobara try karein.");
    }
  };

  const handleDeleteChat = async (event, chatId) => {
    event.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;

    try {
      if (!String(chatId).startsWith("draft-")) {
        await axios.delete(`/api/ai/conversations/${chatId}`, { headers: authHeaders });
      }

      const remaining = chats.filter((chat) => String(chat.id) !== String(chatId));
      setChats(remaining);

      if (String(activeChatId) === String(chatId)) {
        setActiveChatId(remaining[0]?.id ?? null);
        if (remaining[0]) handleSelectChat(remaining[0].id);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Could not delete conversation:", error);
      toast.info("Conversation abhi delete nahi ho paayi. Kripya dobara try karein.");
    }
  };

  const selectBranch = (branchId) => {
    const nextBranch = String(branchId);
    setSelectedBranch(nextBranch);
    if (!activeChat) return;

    if (activeChat.messages.length > 0 && String(activeChat.branchId || "") !== nextBranch) {
      const fresh = createChat(nextBranch);
      setChats((prev) => [fresh, ...prev]);
      setActiveChatId(fresh.id);
      setInput("");
      setInputError("");
      toast.info("Branch changed. A new conversation has been started for this branch.");
      return;
    }

    updateChat(activeChat.id, (chat) => ({ ...chat, branchId: nextBranch }));
  };

  const validateMessage = (text) => {
    if (!text) return "Please type your question first.";
    if (text.length < MIN_CHARS) return "Your message is too short. Please add more detail.";
    if (!/[\p{L}\p{N}]/u.test(text)) return "Please write a valid question using words or numbers.";
    if (countWords(text) > MAX_WORDS) return `Message is too long. Keep it under ${MAX_WORDS} words.`;
    if (text.length > MAX_CHARS) return `Message is too long. Keep it under ${MAX_CHARS} characters.`;
    const last = lastSendRef.current;
    if (
      last.text.toLowerCase() === text.toLowerCase() &&
      Date.now() - last.time < DUPLICATE_WINDOW_MS
    ) {
      return "You just sent this message. Please wait for the reply.";
    }
    return "";
  };

  const addLocalMessage = (chatId, role, content, extra = {}) => {
    updateChat(chatId, (chat) => ({
      ...chat,
      title:
        role === "user" && chat.messages.length === 0
          ? content.slice(0, 45) + (content.length > 45 ? "..." : "")
          : chat.title,
      messages: [
        ...chat.messages,
        { role, content, time: formatTime(new Date()), ...extra },
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  /* ───── Report download (sales / stock / profit ...) ───── */
  const fetchReport = async (request, format, chatId) => {
    const meta = getReportMeta(request);
    const typeSlug = meta.type.replace(/_/g, "-");

    try {
      const mime = format === "pdf" ? "application/pdf" : XLSX_MIME;
      const response = await axios.post(
        meta.endpoint,
        {
          format,
          date_from: request.date_from,
          date_to: request.date_to,
          branch_id: request.branch_id ?? Number(selectedBranch),
          ...(meta.isGeneric ? { report_type: meta.type, options: request.options || {} } : {}),
        },
        {
          responseType: "blob",
          headers: { Accept: mime, Authorization: `Bearer ${token}` },
        }
      );

      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${typeSlug}-report-${request.date_from}-to-${request.date_to}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      // Download ho gayi: koi chat message nahi, browser ka download hi feedback hai.
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Report download failed:", err);
      let message = `${meta.label} abhi download nahi ho pa rahi. Kripya thodi der baad dobara try karein.`;
      const status = err.response?.status;
      if ((status === 403 || status === 422) && err.response?.data instanceof Blob) {
        try {
          const body = JSON.parse(await err.response.data.text());
          if (!body.errors && typeof body.message === "string" && body.message.trim()) {
            message = body.message;
          }
        } catch {
          /* keep default message */
        }
      }
      // Normal (non-red) notice; yeh history mein AI ko nahi bheja jaata.
      addLocalMessage(chatId, "assistant", message, { isNotice: true });
    }
  };

  const runDownloads = async (request, formats, chatId) => {
    sendingRef.current = true;
    setSending(true);
    try {
      for (const format of formats) {
        // eslint-disable-next-line no-await-in-loop
        await fetchReport(request, format, chatId);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
      focusInput();
    }
  };

  const handleDownload = async (download) => {
    if (!download?.date_from || !download?.date_to || !activeChatId) return;
    if (!token || !selectedBranch || sendingRef.current) {
      toast.info("Please select a branch and wait for any current request to finish.");
      return;
    }
    await runDownloads(download, [download.format === "excel" ? "excel" : "pdf"], activeChatId);
  };



  /* ───── Send chat message ───── */
  const handleSend = async (questionOverride) => {
    if (sendingRef.current || sending) return;

   const messageText = (
  typeof questionOverride === "string"
    ? questionOverride
    : input
).trim();
    const validationError = validateMessage(messageText);
    if (validationError) {
      setInputError(validationError);
      return;
    }
    if (Date.now() - lastSendRef.current.time < SEND_COOLDOWN_MS) return;
    if (!token) {
      toast.info("Please log in again.");
      return;
    }
    if (loadingBranches) return;
    if (!selectedBranch) {
      toast.info("No branch is available for this account.");
      return;
    }

    sendingRef.current = true;
    lastSendRef.current = { time: Date.now(), text: messageText };

    let chatId = activeChatId;
    let currentChat = chats.find((chat) => String(chat.id) === String(chatId));

    if (!currentChat) {
      currentChat = createChat(selectedBranch);
      chatId = currentChat.id;
      const draft = currentChat;
      setChats((prev) => [draft, ...prev]);
      setActiveChatId(chatId);
    }

    // Create the database conversation on first send, not just in browser memory.
    if (String(chatId).startsWith("draft-")) {
      try {
        const created = await axios.post(
          "/api/ai/conversations",
          { title: "New chat", branch_id: Number(selectedBranch) },
          { headers: authHeaders }
        );

        const conversation = created.data?.data;
        if (!conversation?.id) throw new Error("Conversation could not be created.");

        const draftId = chatId;
        chatId = Number(conversation.id);
        const saved = {
          ...currentChat,
          id: chatId,
          title: conversation.title || "New chat",
          branchId: String(selectedBranch),
        };
        setChats((prev) => [saved, ...prev.filter((chat) => String(chat.id) !== String(draftId))]);
        setActiveChatId(chatId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Could not create conversation:", error);
        toast.info(FALLBACK_REPLY);
        sendingRef.current = false;
        return;
      }
    }

    updateChat(chatId, (chat) => ({
      ...chat,
      branchId: selectedBranch,
      title:
        chat.messages.length === 0
          ? messageText.slice(0, 45) + (messageText.length > 45 ? "..." : "")
          : chat.title,
      messages: [...chat.messages, { role: "user", content: messageText, time: formatTime(new Date()) }],
      updatedAt: new Date().toISOString(),
    }));

    setInput("");
    setInputError("");
    setSending(true);

    try {
      const response = await axios.post(
        "/api/ai/chat",
        {
          message: messageText,
          conversation_id: Number(chatId),
          branch_id: Number(selectedBranch),
        },
        { headers: authHeaders }
      );

      if (response.data?.status === false) {
        throw new Error(response.data?.message || "AI could not answer your question.");
      }

      const answer = response.data?.message || response.data?.answer || response.data?.response;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      updateChat(chatId, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            role: "assistant",
            content: answer.trim(),
            time: formatTime(new Date()),
            // download object poora save hota hai (type + label ke saath)
            download:
              response.data?.download?.date_from && response.data?.download?.date_to
                ? response.data.download
                : null,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      // Koi bhi error ho: red box/toast nahi, sirf normal friendly jawab.
      // eslint-disable-next-line no-console
      console.error("AI chat failed:", err);
      updateChat(chatId, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            role: "assistant",
            content: FALLBACK_REPLY,
            time: formatTime(new Date()),
            isNotice: true,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      sendingRef.current = false;
      setSending(false);
      focusInput();
    }
  };

  /* ───── Input handlers ───── */
  const handleKeyDown = (event) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey && !isTouchDevice()) {
      event.preventDefault();
      if (canSend) handleSend();
      else setInputError(validateMessage(input.trim()) || "");
      return;
    }

    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    const el = event.target;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    const endsWithSpace = /\s$/.test(input);

    // At the word limit: allow finishing the last word / replacing a selection,
    // but block starting a new word or a new line.
    if (
      atLimit &&
      !hasSelection &&
      (event.key === "Enter" || (printable && (event.key === " " || endsWithSpace)))
    ) {
      event.preventDefault();
      setInputError(LIMIT_MSG);
    }
  };

  const handleInputChange = (event) => {
    let value = event.target.value;
    let message = "";

    if (countWords(value) > MAX_WORDS) {
      value = truncateWords(value, MAX_WORDS);
      message = LIMIT_MSG;
    }
    if (value.length > MAX_CHARS) {
      value = value.slice(0, MAX_CHARS);
      message = `Limit reached: maximum ${MAX_CHARS} characters per message.`;
    }

    setInput(value);
    setInputError(message);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const el = event.target;
    const pasted = event.clipboardData.getData("text");
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;

    let next = input.slice(0, start) + pasted + input.slice(end);
    let message = "";

    if (countWords(next) > MAX_WORDS) {
      next = truncateWords(next, MAX_WORDS);
      message = `Pasted text was cut to ${MAX_WORDS} words.`;
    }
    if (next.length > MAX_CHARS) {
      next = next.slice(0, MAX_CHARS);
      message = `Pasted text was cut to ${MAX_CHARS} characters.`;
    }

    setInput(next);
    setInputError(message);

    const caret = Math.min(start + pasted.length, next.length);
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    setInputError("");
    focusInput();
  };

  if (!rect) return null;

  const hasMessages = activeChat && activeChat.messages.length > 0;

  return (
    <div className="aic-panel" style={{ top: rect.top, left: rect.left, right: 0, bottom: 0 }}>
      <style>{CSS}</style>

      <section className="aic-main">
        <header className="aic-top">
          <div className="aic-top-left">
            <div className="aic-logo">
              <img src={AVATAR} alt="AI Assistant" />
            </div>
            <span className="aic-title">AI Assistant</span>
          </div>

          <div className="aic-top-right">
            <button
              type="button"
              className={`aic-btn ${historyOpen ? "on" : ""}`}
              onClick={() => setHistoryOpen((open) => !open)}
              aria-label="Recent chats"
              aria-expanded={historyOpen}
            >
              <HistoryIcon />
              <span className="aic-btn-label"></span>
            </button>

            <select
              aria-label="Branch"
              className="aic-select"
              value={selectedBranch}
              disabled={loadingBranches || branches.length === 0}
              onChange={(e) => selectBranch(e.target.value)}
            >
              {branches.length === 0 && <option value="">No branches</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="aic-scroll" ref={scrollRef}>
          <div className="aic-col" style={{ minHeight: "100%" }}>
            {!hasMessages ? (
              <div className="aic-welcome">
                <div className="aic-hero">
                  <img src={AVATAR} alt="AI Assistant" />
                </div>
                <div className="aic-h1">How can I help your business today?</div>
                <div className="aic-sub">Pick a question or type your own below.</div>

                <div className="aic-chips">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      type="button"
                      key={item.title}
                      className="aic-chip"
                      disabled={sending || loadingBranches}
                      onClick={() => handleQuickPrompt(item.prompt)}
                    >
                      <div className="aic-chip-title">
                        {item.icon} {item.title}
                      </div>
                      <div className="aic-chip-text">{item.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {activeChat.messages.map((message, index) => (
                  <MessageRow
                    key={`${activeChat.id}_${index}`}
                    message={message}
                    onDownload={handleDownload}
                  />
                ))}

                {sending && <TypingRow />}
              </>
            )}
          </div>
        </div>

        <div className="aic-composer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className={`aic-box ${atLimit || inputError ? "limit" : ""}`}>
              <textarea
                ref={textareaRef}
                className="aic-textarea"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask anything about your business..."
                rows={1}
                readOnly={sending || loadingBranches}
                aria-invalid={!!inputError}
              />
              <button type="submit" className="aic-send" disabled={!canSend} aria-label="Send message">
                {sending ? (
                  <svg className="aic-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>

            <div className="aic-meta">
              <span className={inputError ? "err" : ""} role={inputError ? "alert" : undefined}>
                {inputError ||
                  (isTouchDevice() ? "Tap the arrow to send." : "Enter to send · Shift+Enter for new line")}
              </span>
              <span className={`aic-count ${atLimit ? "max" : nearLimit ? "warn" : ""}`}>
                {wordCount}/{MAX_WORDS} words
              </span>
            </div>

            <div className="aic-note">
              AI can make mistakes. Verify important decisions against your POS reports.
            </div>
          </form>
        </div>
      </section>

      {historyOpen && (
        <button
          type="button"
          aria-label="Close history"
          className="aic-backdrop"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      <aside className={`aic-hist ${historyOpen ? "" : "closed"}`}>
        <div className="aic-hist-top">
          <span className="aic-hist-title">Recent chats</span>
          <button
            type="button"
            className="aic-iconbtn"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close history"
          >
            <CloseIcon />
          </button>
        </div>

        <button type="button" className="aic-newbtn" onClick={handleNewChat}>
          <PlusIcon size={15} />
          New chat
        </button>

        <div className="aic-list">
          {loadingChats ? (
            <p className="aic-empty">Loading chat history...</p>
          ) : chats.length === 0 ? (
            <p className="aic-empty">Your conversations will appear here.</p>
          ) : (
            grouped.map(([label, list]) => (
              <div key={label}>
                <div className="aic-group">{label}</div>
                {list.map((chat) => (
                  <div
                    key={chat.id}
                    role="button"
                    tabIndex={0}
                    className={`aic-item ${activeChatId === chat.id ? "active" : ""}`}
                    onClick={() => handleSelectChat(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectChat(chat.id);
                      }
                    }}
                  >
                    <span className="aic-item-title">{chat.title || "New chat"}</span>
                    <button
                      type="button"
                      className="aic-del"
                      aria-label="Delete conversation"
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                    >
                      <DeleteIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="aic-hist-foot">Saved to your account.</div>
      </aside>
    </div>
  );
}

export default function AiInsights() {
  return (
    <Layout>
      <div style={{ height: 0 }} />
      {typeof document !== "undefined" && createPortal(<ChatPanel />, document.body)}
    </Layout>
  );
}





