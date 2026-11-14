import { useSyncExternalStore } from "react";

import { isOffline } from "@/lib/network";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * `isOffline()`, kept in sync with the browser's `online` and `offline` events. Without a DOM
 * (the build-time prerender) it reports online.
 */
export function useIsOffline(): boolean {
  return useSyncExternalStore(subscribe, isOffline, () => false);
}
