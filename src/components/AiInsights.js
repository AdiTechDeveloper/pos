
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Layout from "./layout";
import { getAiInsightBranches } from "../utils/api";
import { toast } from "react-toastify";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const MAX_WORDS = 100; // 200 words par typing lock
const MIN_CHARS = 1;
const MAX_CHARS = 1500;
const SEND_COOLDOWN_MS = 1500;
const DUPLICATE_WINDOW_MS = 15000;
const MAX_SAVED_CHATS = 50;
const TA_MIN = 26; // textarea min height (px)
const TA_MAX = 160; // textarea max height (px)

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem("user_detail") || "{}") || {};
  } catch {
    return {};
  }
};

const userData = getUserData();

const STORAGE_KEY = `pos_ai_chats_${
  userData.id || userData.user?.id || userData.email || "user"
}`;

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

const loadChats = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const createChat = (branchId = null) => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: "New chat",
  branchId,
  messages: [],
  updatedAt: new Date().toISOString(),
});

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(pointer: coarse)").matches;

const isDesktop = () =>
  typeof window !== "undefined" && window.innerWidth >= 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const groupChats = (chats) => {
  const today = startOfDay(new Date());
  const day = 24 * 60 * 60 * 1000;
  const groups = { Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };

  [...chats]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach((chat) => {
      const t = startOfDay(chat.updatedAt);
      if (t >= today) groups.Today.push(chat);
      else if (t >= today - day) groups.Yesterday.push(chat);
      else if (t >= today - 7 * day) groups["Previous 7 days"].push(chat);
      else groups.Older.push(chat);
    });

  return Object.entries(groups).filter(([, list]) => list.length > 0);
};

/* Header ke neeche kitna offset chahiye (header fixed ho ya static) */
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

/* Left sidebar (Navbar) kahan tak hai, uske right se panel shuru hona chahiye */
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
      if (isSideColumn && (pos === "fixed" || pos === "sticky" || pos === "static" || pos === "relative")) {
        left = Math.max(left, b.right);
      }
    });
  }

  return left;
};

/* AI answer formatting: **bold**, "- item", "1. item" */
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );

const FormattedText = ({ text }) => (
  <>
    {text.split("\n").map((line, i) => {
      if (!line.trim()) return null;

      const bullet = line.match(/^\s*[-*•]\s+(.*)/);
      if (bullet) {
        return (
          <div key={i} className="aic-li">
            <span className="aic-dot" />
            <span>{renderInline(bullet[1])}</span>
          </div>
        );
      }

      const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/);
      if (numbered) {
        return (
          <div key={i} className="aic-li">
            <span className="aic-num">{numbered[1]}.</span>
            <span>{renderInline(numbered[2])}</span>
          </div>
        );
      }

      return (
        <p key={i} className="aic-p">
          {renderInline(line)}
        </p>
      );
    })}
  </>
);

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */
const Svg = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
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

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */
function MessageRow({ message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy.");
    }
  };

  if (message.role === "user") {
    return (
      <div className="aic-user">
        <div className="aic-ubub">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="aic-ai">
      <div className="aic-spark">
         <img src="./avatar.png" alt="AI Assistant" />
      </div>
      <div className="aic-aibody">
        {message.isError ? (
          <div className="aic-err">{message.content}</div>
        ) : (
          <div className="aic-aitext">
            <FormattedText text={message.content} />
          </div>
        )}

        <div className="aic-actions">
          {!message.isError && (
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
         <img src="./avatar.png" alt="AI Assistant" />
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
  {
    icon: "📊",
    title: "Sales performance",
    prompt: "How much did my business sell today?",
  },
  {
    icon: "📦",
    title: "Stock analysis",
    prompt: "Which products are running low on stock?",
  },
  {
    icon: "💰",
    title: "Profit analysis",
    prompt: "Analyze my business profit for this month.",
  },
  {
    icon: "💡",
    title: "Business suggestions",
    prompt: "What should I do to improve my business?",
  },
];

/* ------------------------------------------------------------------ */
/*  Scoped CSS (sab px mein, template ki CSS se bachne ke liye)         */
/*  Font sizes yahan se badal sakte ho:                                */
/*    --chat  = tumhare message + input ka size (11px)                 */
/*    --reply = AI ke response ka size (10px)                          */
/* ------------------------------------------------------------------ */
const CSS = `
.aic-panel, .aic-panel * { box-sizing: border-box;  }
.aic-panel {
  --chat: 11px; --reply: 10px;
  --ink: #1f2328; --muted: #6b7280; --faint: #9aa0a8; --line: #ececf0; --soft: #f5f5f8; --accent: #4f46e5;
  position: fixed; z-index: 10; display: flex; overflow: hidden;
  background: #fff; color: var(--ink);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
  font-size: 12px; line-height: 1.5; letter-spacing: normal; text-transform: none !important;
}
.aic-panel * { text-transform: none !important; letter-spacing: normal; font-size:14px}
.aic-panel button, .aic-panel select, .aic-panel textarea {
  font-family: inherit; min-width: 0; min-height: 0; margin: 0; box-shadow: none; text-shadow: none;
}
.aic-panel button { cursor: pointer; }
.aic-panel svg { display: block; flex-shrink: 0; fill: none !important; overflow: visible; }
.aic-panel svg path, .aic-panel svg rect, .aic-panel svg circle { fill: none !important; stroke: currentColor !important; }
.aic-panel .aic-send svg, .aic-panel .aic-iconbtn svg { width: 18px !important; height: 18px !important; }
.aic-panel .aic-scroll, .aic-panel .aic-list { scrollbar-width: thin; scrollbar-color: #d9d9df transparent; }

/* Main */
.aic-panel .aic-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #fff; }
.aic-panel .aic-top { height: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 1.5rem; margin:0.5rem; border-bottom:1px solid gray}
.aic-panel .aic-top-left, .aic-panel .aic-top-right { display: flex; align-items: center; gap: 8px; min-width: 0; }
.aic-panel .aic-logo { width: 45px; height: 45px; border-radius: 8px; background: var(--accent); color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.aic-panel .aic-title { font-size: 15px; font-weight: 600; white-space: nowrap; }
.aic-panel .aic-select {
  height: 32px; max-width: 200px; padding: 0 10px; border: 1px solid #e0e0e6; border-radius: 8px;
  background: #fff; color: var(--ink); font-size: 12px; outline: none;
}
.aic-panel .aic-select:focus { border-color: var(--accent); }
.aic-panel .aic-btn {
  height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; border: 1px solid #e0e0e6; border-radius: 8px;
  background: #fff; color: #374151; font-size: 12px; font-weight: 500; transition: background .15s;
}
.aic-panel .aic-btn:hover { background: var(--soft); }
.aic-panel .aic-btn.on { background: #eef0ff; border-color: #cfd3ff; color: var(--accent); }
.aic-panel .aic-btn svg { width: 15px !important; height: 15px !important; }
.aic-panel .aic-iconbtn { width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 8px; background: transparent; color: #4b5563; display: flex; align-items: center; justify-content: center; }
.aic-panel .aic-iconbtn:hover { background: var(--soft); }

.aic-panel .aic-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 6px 20px 18px; }
.aic-panel .aic-col { width: 100%; max-width: 700px; margin: 0 auto; }

/* Welcome */
.aic-panel .aic-welcome { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 0; }
.aic-panel .aic-hero { width: 42px; height: 42px; border-radius: 13px; background: var(--accent); color: #fff; font-size: 19px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }

.aic-panel .aic-h1 { font-size: 22px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; margin: 0; }
.aic-panel .aic-sub { font-size: 12px; color: var(--muted); margin: 6px 0 22px; }
.aic-panel .aic-chips { width: 100%; max-width: 560px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding:10px; }
.aic-panel .aic-chip { text-align: left; padding: 30px 14px; border: 1px solid #e6e6ec; border-radius: 12px; background: #fff; color: var(--ink); transition: background .15s, border-color .15s; }
.aic-panel .aic-chip:hover:not(:disabled) { background: #fafafd; border-color: #cfd0f5; }
.aic-panel .aic-chip:disabled { opacity: .5; cursor: not-allowed; }
.aic-panel .aic-chip-title { font-size: 15px; font-weight: 600; }
.aic-panel .aic-chip-text { font-size: 14px; color: var(--muted); margin-top: 3px; line-height: 1.45; }

/* Messages */
.aic-panel .aic-user { display: flex; justify-content: flex-end; margin: 18px 0 8px; }
.aic-panel .aic-ubub { max-width: 78%; padding: 9px 14px; border-radius: 16px 16px 4px 16px; background: var(--soft); font-size: 14px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.aic-panel .aic-ai { display: flex; gap: 10px; margin: 12px 0; }
.aic-panel .aic-spark { width: 34px; height: 34px; flex-shrink: 0; margin-top: 1px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.aic-panel .aic-aibody { flex: 1; min-width: 0; }
.aic-panel .aic-aitext { font-size: var(--reply); line-height: 1.8; color: #2b2f36; overflow-wrap: anywhere; }
.aic-panel .aic-p { margin: 0 0 8px; }
.aic-panel .aic-aitext strong { font-weight: 600; color: #11151a; }
.aic-panel .aic-li { display: flex; gap: 8px; margin: 0 0 5px; }
.aic-panel .aic-dot { width: 4px; height: 4px; margin-top: 8px; flex-shrink: 0; border-radius: 50%; background: #9ca3af; }
.aic-panel .aic-num { flex-shrink: 0; font-weight: 600; color: var(--accent); }
.aic-panel .aic-err { padding: 9px 12px; border: 1px solid #fecaca; border-radius: 10px; background: #fef2f2; color: #991b1b; font-size: var(--reply); line-height: 1.7; }
.aic-panel .aic-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; font-size: 10px; color: var(--faint); }
.aic-panel .aic-copy { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; margin-left: -6px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 10px; }
.aic-panel .aic-copy:hover { background: var(--soft); color: var(--ink); }
.aic-panel .aic-typing { display: flex; align-items: center; gap: 5px; height: 26px; }
.aic-panel .aic-typing span { width: 6px; height: 6px; border-radius: 50%; background: #a5a8f0; animation: aic-bounce 1s infinite ease-in-out; }
.aic-panel .aic-typing span:nth-child(2) { animation-delay: .15s; }
.aic-panel .aic-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes aic-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-4px); opacity: 1; } }

/* Composer */
.aic-panel .aic-composer { flex-shrink: 0; padding: 6px 20px 10px; background: #fff; }
.aic-panel .aic-box {
  width: 100%; max-width: 700px; margin: 0 auto; display: flex; align-items: flex-end; gap: 8px;
  padding: 6px 6px 6px 14px; border: 1px solid #dcdce3; border-radius: 16px; background: #fff;
  box-shadow: 0 1px 8px rgba(15, 18, 22, .05); transition: border-color .15s, box-shadow .15s;
}
.aic-panel .aic-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79, 70, 229, .1); }
.aic-panel .aic-box.limit { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, .1); }
.aic-panel .aic-textarea {
  flex: 1; width: 100%; display: block; resize: none; border: 0 !important; outline: 0 !important;
  box-shadow: none !important; background: transparent !important; border-radius: 0 !important;
  padding: 4px 0 !important; height: ${TA_MIN}px; min-height: ${TA_MIN}px !important; max-height: ${TA_MAX}px !important;
  font-size: 13px; line-height: 1.6 !important; color: var(--ink) !important;
}
.aic-panel .aic-textarea::placeholder { color: var(--faint); }
.aic-panel .aic-send { width: 34px; height: 34px; flex-shrink: 0; border: 0; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.aic-panel .aic-send:hover:not(:disabled) { background: #4338ca; }
.aic-panel .aic-send:disabled { background: #ececf0; color: #8b9099; cursor: not-allowed; }
.aic-panel .aic-spin { animation: aic-rot .8s linear infinite; }
@keyframes aic-rot { to { transform: rotate(360deg); } }
.aic-panel .aic-meta { width: 100%; max-width: 700px; margin: 6px auto 0; padding: 0 4px; display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: var(--faint); }
.aic-panel .aic-meta .err { color: #dc2626; font-weight: 500; }
.aic-panel .aic-count { white-space: nowrap; font-weight: 600; }
.aic-panel .aic-count.warn { color: #d97706; }
.aic-panel .aic-count.max { color: #dc2626; }
.aic-panel .aic-note { text-align: center; margin-top: 4px; font-size: 10px; color: #b0b4bb; }

/* History: RIGHT side */
.aic-panel .aic-hist {
  width: 268px; flex-shrink: 0; display: flex; flex-direction: column;
  background: #fafafb; border-left: 1px solid var(--line);
  transition: margin-right .25s ease, transform .25s ease;
}
.aic-panel .aic-hist.closed { margin-right: -268px; visibility: hidden; transition: margin-right .25s ease, visibility 0s .25s; }
.aic-panel .aic-hist-top { height: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 14px 0 16px; border-bottom: 1px solid var(--line); }
.aic-panel .aic-hist-title { font-size: 14px; font-weight: 600; }
.aic-panel .aic-newbtn { display: flex; align-items: center; justify-content: center; gap: 6px; width: calc(100% - 24px); margin: 12px; padding: 9px 12px; border: 1px solid #e0e0e6; border-radius: 10px; background: #fff; color: #1f2328; font-size: 12px; font-weight: 500; transition: background .15s; }
.aic-panel .aic-newbtn:hover { background: var(--soft); }
.aic-panel .aic-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 10px; }
.aic-panel .aic-group { padding: 12px 8px 4px; font-size: 10.5px; font-weight: 600; color: var(--faint); }
.aic-panel .aic-item { display: flex; align-items: center; gap: 2px; padding: 1px 2px 1px 10px; margin-bottom: 1px; border-radius: 8px; cursor: pointer; font-size: 12px; color: #2b2f36; transition: background .12s; }
.aic-panel .aic-item:hover { background: #efeff3; }
.aic-panel .aic-item.active { background: #e9e9ff; color: #3730a3; font-weight: 500; }
.aic-panel .aic-item-title { flex: 1; min-width: 0; padding: 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aic-panel .aic-del { width: 26px; height: 26px; border: 0; border-radius: 6px; background: transparent; color: var(--faint); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .12s; }
.aic-panel .aic-item:hover .aic-del, .aic-panel .aic-item.active .aic-del { opacity: 1; }
.aic-panel .aic-del:hover { background: #fde8e8; color: #dc2626; }
.aic-panel .aic-empty { padding: 28px 14px; text-align: center; font-size: 11.5px; color: var(--faint); line-height: 1.6; }
.aic-panel .aic-hist-foot { padding: 10px 16px; border-top: 1px solid var(--line); font-size: 10.5px; color: var(--faint); }
.aic-panel .aic-backdrop { display: none; }

/* Tablet / mobile: history overlay (right se) */
@media (max-width: 999px) {
  .aic-panel .aic-hist { position: absolute; z-index: 30; top: 0; bottom: 0; right: 0; width: 280px; max-width: 86%; box-shadow: 0 0 30px rgba(0,0,0,.15); }
  .aic-panel .aic-hist.closed { margin-right: 0; transform: translateX(105%); transition: transform .25s ease, visibility 0s .25s; }
  .aic-panel .aic-backdrop { display: block; position: absolute; inset: 0; z-index: 20; border: 0; background: rgba(15, 18, 22, .35); }
}
@media (max-width: 640px) {
  .aic-panel .aic-chips { grid-template-columns: 1fr; }
  .aic-panel .aic-scroll { padding: 4px 12px 14px; }
  .aic-panel .aic-composer { padding: 6px 12px 8px; }
  .aic-panel .aic-select { max-width: 130px; }
  .aic-panel .aic-btn-label, .aic-panel .aic-title { display: none; }
  .aic-panel .aic-ubub { max-width: 90%; }
}
@media (max-height: 760px) {
  .aic-panel .aic-hero { display: none; }
  .aic-panel .aic-sub { margin-bottom: 16px; }
}
@media (hover: none) { .aic-panel .aic-del { opacity: 1; } }
`;

/* ------------------------------------------------------------------ */
/*  Chat panel                                                         */
/* ------------------------------------------------------------------ */
function ChatPanel() {
  const token = userData.token;

  const [rect, setRect] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [chats, setChats] = useState(loadChats);
  const [activeChatId, setActiveChatId] = useState(
    () => loadChats()[0]?.id || null
  );
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(isDesktop);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const sendingRef = useRef(false);
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

  /* ---------- panel ko Layout ke content area par fit karo ---------- */
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
      setRect({ top: getTopOffset(target), left: getLeftOffset(target) });
    };

    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1000);
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
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

  /* ---------- persistence ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(chats.slice(0, MAX_SAVED_CHATS))
      );
    } catch {
      /* ignore */
    }
  }, [chats]);

  /* ---------- branches ---------- */
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
        if (mounted) toast.error("Could not load branches.");
      } finally {
        if (mounted) setLoadingBranches(false);
      }
    };

    loadBranches();
    return () => {
      mounted = false;
    };
  }, [token]);

  /* ---------- scroll sirf messages area mein ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeChat?.messages, sending]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [activeChatId, rect]);

  /* ---------- textarea auto-grow ---------- */
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

  /* ---------- chat helpers ---------- */
  const updateChat = (chatId, updater) =>
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? updater(chat) : chat))
    );

  const focusInput = () => setTimeout(() => textareaRef.current?.focus(), 50);

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

  const handleSelectChat = (chatId) => {
    const chat = chats.find((item) => item.id === chatId);
    setActiveChatId(chatId);
    setInput("");
    setInputError("");
    if (chat?.branchId) setSelectedBranch(String(chat.branchId));
    closeHistoryOnMobile();
  };

  const handleDeleteChat = (event, chatId) => {
    event.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;

    const remaining = chats.filter((chat) => chat.id !== chatId);
    setChats(remaining);
    if (activeChatId === chatId) {
      const next = [...remaining].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      )[0];
      setActiveChatId(next?.id || null);
    }
  };

  const selectBranch = (branchId) => {
    setSelectedBranch(String(branchId));
    if (activeChatId) {
      updateChat(activeChatId, (chat) => ({
        ...chat,
        branchId: String(branchId),
      }));
    }
  };

  /* ---------- validation ---------- */
  const validateMessage = (text) => {
    if (!text) return "Please type your question first.";
    if (text.length < MIN_CHARS)
      return "Your message is too short. Please add more detail.";
    if (!/[\p{L}\p{N}]/u.test(text))
      return "Please write a valid question using words or numbers.";
    if (countWords(text) > MAX_WORDS)
      return `Message is too long. Keep it under ${MAX_WORDS} words.`;
    if (text.length > MAX_CHARS)
      return `Message is too long. Keep it under ${MAX_CHARS} characters.`;

    const last = lastSendRef.current;
    if (
      last.text.toLowerCase() === text.toLowerCase() &&
      Date.now() - last.time < DUPLICATE_WINDOW_MS
    ) {
      return "You just sent this message. Please wait for the reply.";
    }
    return "";
  };

  /* ---------- send ---------- */
  const handleSend = async () => {
    if (sendingRef.current || sending) return;

    const messageText = input.trim();
    const error = validateMessage(messageText);
    if (error) {
      setInputError(error);
      return;
    }

    if (Date.now() - lastSendRef.current.time < SEND_COOLDOWN_MS) return;

    if (!token) {
      toast.error("Please log in again.");
      return;
    }
    if (loadingBranches) return;
    if (!selectedBranch) {
      toast.error("No branch is available for this account.");
      return;
    }

    sendingRef.current = true;
    lastSendRef.current = { time: Date.now(), text: messageText };

    let chatId = activeChatId;
    if (!chats.some((chat) => chat.id === chatId)) {
      const fresh = createChat(selectedBranch);
      chatId = fresh.id;
      setChats((prev) => [fresh, ...prev]);
      setActiveChatId(chatId);
    }

    updateChat(chatId, (chat) => ({
      ...chat,
      branchId: selectedBranch,
      title:
        chat.messages.length === 0
          ? messageText.slice(0, 45) + (messageText.length > 45 ? "..." : "")
          : chat.title,
      messages: [
        ...chat.messages,
        { role: "user", content: messageText, time: formatTime(new Date()) },
      ],
      updatedAt: new Date().toISOString(),
    }));

    setInput("");
    setInputError("");
    setSending(true);

    try {
      const response = await axios.post(
        "/api/ai/chat",
        { message: messageText, branch_id: Number(selectedBranch) },
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.status === false) {
        throw new Error(
          response.data?.message || "AI could not answer your question."
        );
      }

      const answer =
        response.data?.message ||
        response.data?.answer ||
        response.data?.response;

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
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        "Something went wrong. Please try again.";

      updateChat(chatId, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            role: "assistant",
            content: `Sorry, I couldn't process your request. ${errorMessage}`,
            time: formatTime(new Date()),
            isError: true,
          },
        ],
      }));

      toast.error(errorMessage);
    } finally {
      sendingRef.current = false;
      setSending(false);
      focusInput();
    }
  };

  /* ---------- input handlers: 200 words par typing LOCK ---------- */
  const handleKeyDown = (event) => {
    if (event.nativeEvent.isComposing) return;

    // Desktop: Enter = send. Mobile: Enter = new line.
    if (event.key === "Enter" && !event.shiftKey && !isTouchDevice()) {
      event.preventDefault();
      if (canSend) handleSend();
      else setInputError(validateMessage(input.trim()) || "");
      return;
    }

    // Limit ke baad sirf delete / navigation allowed
    const printable =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey;

    if (atLimit && (printable || event.key === "Enter")) {
      event.preventDefault();
      setInputError(LIMIT_MSG);
    }
  };

  // Mobile keyboard / autocorrect safety net
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
    <div
      className="aic-panel"
      style={{
        top: rect.top,
        left: rect.left,
        right: 0,
        bottom: 0,
      }}
    >
      <style>{CSS}</style>

      {/* ---------------- Main ---------------- */}
      <section className="aic-main">
        <header className="aic-top">
          <div className="aic-top-left">
            <div className="aic-logo">
             <img width={45} height={45} src="./avatar.png" alt="AI Assistant" />
            </div>
            <span className="aic-title">AI Assistant</span>
            
          </div>

          <div className="aic-top-right">
            {/* <button type="button" className="aic-btn" onClick={handleNewChat}>
              <PlusIcon size={15} />
              <span className="aic-btn-label">New chat</span>
            </button>
            <button
              type="button"
              className={`aic-btn ${historyOpen ? "on" : ""}`}
              onClick={() => setHistoryOpen((open) => !open)}
              aria-label="Recent chats"
              aria-expanded={historyOpen}
            >
              <HistoryIcon />
              <span className="aic-btn-label ">History</span>
            </button> */}
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
                   <img src="./avatar.png" alt="AI Assistant" />
                </div>
                <div className="aic-h1">How can I help your business today?</div>
                <div className="aic-sub">
                  Pick a question or type your own below.
                </div>

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

              <button
                type="submit"
                className="aic-send"
                disabled={!canSend}
                aria-label="Send message"
              >
                {sending ? (
                  <svg
                    className="aic-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>

            <div className="aic-meta">
              <span
                className={inputError ? "err" : ""}
                role={inputError ? "alert" : undefined}
              >
                {inputError ||
                  (isTouchDevice()
                    ? "Tap the arrow to send."
                    : "Enter to send · Shift+Enter for new line")}
              </span>
              <span
                className={`aic-count ${
                  atLimit ? "max" : nearLimit ? "warn" : ""
                }`}
              >
                {wordCount}/{MAX_WORDS} words
              </span>
            </div>

            <div className="aic-note">
              AI can make mistakes. Verify important decisions against your POS
              reports.
            </div>
          </form>
        </div>
      </section>

      {/* ---------------- History: RIGHT side ---------------- */}
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
          {chats.length === 0 ? (
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
                    className={`aic-item ${
                      activeChatId === chat.id ? "active" : ""
                    }`}
                    onClick={() => handleSelectChat(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectChat(chat.id);
                      }
                    }}
                  >
                    <span className="aic-item-title">
                      {chat.title || "New chat"}
                    </span>
                    <button
                      type="button"
                      className="aic-del"
                      aria-label="Delete conversation"
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="aic-hist-foot">Saved in this browser.</div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AiInsights() {
  return (
    <Layout>
      {/* Layout ke andar sirf placeholder; asli chat panel portal se content area par fit hota hai */}
      <div style={{ height: 0 }} />
      {typeof document !== "undefined" &&
        createPortal(<ChatPanel />, document.body)}
    </Layout>
  );
}