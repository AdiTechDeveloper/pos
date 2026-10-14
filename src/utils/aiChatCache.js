/**
 * In-memory cache for the AI Assistant chats.
 *
 * Why: when the user leaves the AI Insights page (sidebar tab change) and comes
 * back, the page is mounted again. Without a cache it re-fetches the chat list and
 * the open conversation from the database every single time.
 *
 * This lives at module level (like the caches in AppDataContext), so it survives
 * route changes. It is cleared automatically when a different user logs in, and
 * after the TTL. A full browser refresh also clears it (memory only).
 */

// 8 hours, same as CACHE_TTL in AppDataContext.
const CACHE_TTL = 8 * 60 * 60 * 1000;

let cache = null; // { userId, chats, activeChatId, selectedBranch, timestamp }

const getUserId = () => {
  try {
    const detail = JSON.parse(localStorage.getItem("user_detail") || "{}") || {};
    return detail?.user?.id ?? detail?.id ?? detail?.user?.email ?? detail?.email ?? null;
  } catch {
    return null;
  }
};

export function getAiChatCache() {
  if (!cache) return null;

  const expired = Date.now() - cache.timestamp >= CACHE_TTL;
  const otherUser = cache.userId !== getUserId();

  if (expired || otherUser) {
    cache = null;
    return null;
  }

  return cache;
}

export function setAiChatCache({ chats, activeChatId, selectedBranch }) {
  cache = {
    userId: getUserId(),
    chats,
    activeChatId,
    selectedBranch,
    timestamp: Date.now(),
  };
}

export function clearAiChatCache() {
  cache = null;
}