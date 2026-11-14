import { useCallback, useSyncExternalStore } from "react";

/** Phones: below the 48rem breakpoint the design canvas switches to its phone layouts. */
export const PHONE_QUERY = "(width < 48rem)";

/**
 * Whether `query` matches now, kept in sync as the viewport changes. Without a DOM (the
 * build-time prerender) it reports `false`, i.e. the desktop layout.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsPhone = () => useMediaQuery(PHONE_QUERY);
