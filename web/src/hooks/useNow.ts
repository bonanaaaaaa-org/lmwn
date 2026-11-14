import { useSyncExternalStore } from "react";

/**
 * One shared minute clock for every component that shows time-dependent facts (Open Now).
 * It ticks on each minute boundary while anything subscribes, and re-reads the clock when
 * a tab becomes visible again, since browsers throttle timers in background tabs.
 */

const MINUTE = 60_000;

const startOfMinute = (ms: number) => ms - (ms % MINUTE);

let current = new Date(startOfMinute(Date.now()));
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function refresh() {
  const minute = startOfMinute(Date.now());
  if (minute !== current.getTime()) {
    current = new Date(minute);
    for (const listener of listeners) listener();
  }
}

function scheduleTick() {
  timer = setTimeout(
    () => {
      refresh();
      scheduleTick();
    },
    MINUTE - (Date.now() % MINUTE),
  );
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    scheduleTick();
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

function getSnapshot() {
  // A first subscriber may arrive long after the last tick stopped.
  // Same minute → same Date, so React sees a stable snapshot.
  if (listeners.size === 0) {
    const minute = startOfMinute(Date.now());
    if (minute !== current.getTime()) current = new Date(minute);
  }
  return current;
}

/** The current time to the minute; re-renders the caller when the minute changes. */
export function useNow(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
