import { useEffect, useState } from "react";
import axios from "axios";

/**
 * Tiny stale-while-revalidate cache for dashboard API calls.
 *
 * - First visit: fetches and stores the response.
 * - Next visits (within `ttl`): shows the stored data instantly, no request.
 * - After `ttl`: shows the stored data instantly and refreshes it in the background
 *   (no loading skeleton).
 * - Call invalidateDashboardCache() after anything that changes the numbers
 *   (new expense, new sale, ...) and mounted dashboards refetch automatically.
 *
 * Place at: src/utils/dashboardCache.js
 */

const store = new Map(); // key -> { data, at }
const inflight = new Map(); // key -> Promise
const listeners = new Set();
let generation = 0;
let activeToken = null;

// Cache is per logged-in user: the token is part of every key
const keyOf = (token, url, params) =>
  `${token || "anon"}|${url}?${JSON.stringify(params || {})}`;

// A different token means a different login (logout -> login as someone else)
function syncToken(token) {
  const next = token || null;
  if (next !== activeToken) {
    if (activeToken !== null) {
      generation += 1;
      store.clear();
      inflight.clear();
    }
    activeToken = next;
  }
}

// Call this on logout as well
export const clearDashboardCache = () => invalidateDashboardCache();

export function invalidateDashboardCache() {
  generation += 1;
  store.clear();
  inflight.clear();
  listeners.forEach((fn) => fn());
}

function load(key, url, params, token) {
  if (inflight.has(key)) return inflight.get(key);

  const gen = generation;

  const request = axios
    .get(url, {
      params,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => {
      if (gen === generation) {
        store.set(key, { data: res.data?.data ?? null, at: Date.now() });
      }
    })
    .catch((err) => {
      console.error("Dashboard request failed:", url, err?.response || err);
      if (gen === generation && !store.has(key)) {
        store.set(key, { data: null, at: Date.now() });
      }
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

export function useCachedApi(
  url,
  params,
  { token, ttl = 60000, enabled = true } = {}
) {
  syncToken(token);
  const key = keyOf(token, url, params);
  const [, force] = useState(0);

  const entry = store.get(key);
  const missing = !entry;

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let alive = true;
    const current = store.get(key);

    if (current && Date.now() - current.at < ttl) return undefined;

    load(key, url, params, token).then(() => {
      if (alive) force((n) => n + 1);
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, missing]);

  return { data: entry?.data ?? null, loading: enabled && missing };
}