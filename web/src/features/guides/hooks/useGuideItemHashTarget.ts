import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { guideItemIdFromHash, itemAnchorId } from "@/features/guides/lib/share";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** How long a shared card stays highlighted. */
export const HIGHLIGHT_MS = 2400;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const FOLLOWED_KEY = "gems:followed-item-links";
const MAX_FOLLOWED = 50;

/**
 * History entries whose share link was already followed, kept for the tab's session like
 * React Router's scroll positions. Back, Forward or a reload then lands where the diner left
 * off (ScrollRestoration) instead of jumping to the card again.
 */
const followedLinks = {
  read(): string[] {
    try {
      const value: unknown = JSON.parse(
        window.sessionStorage.getItem(FOLLOWED_KEY) ?? "[]",
      );
      return Array.isArray(value)
        ? value.filter((entry) => typeof entry === "string")
        : [];
    } catch {
      return [];
    }
  },
  has(entry: string): boolean {
    return this.read().includes(entry);
  },
  write(entries: readonly string[]): void {
    try {
      window.sessionStorage.setItem(FOLLOWED_KEY, JSON.stringify(entries));
    } catch {
      // Storage unavailable (private mode, quota): following again on Back is harmless.
    }
  },
  add(entry: string): void {
    this.write([...this.read(), entry].slice(-MAX_FOLLOWED));
  },
};

/** The first history entry of a page load; React Router gives it this key on every load. */
const FIRST_ENTRY_KEY = "default";

/** How the browser reached this page: a link opened or pasted, a reload, or Back/Forward. */
function pageLoadType(): NavigationTimingType | undefined {
  try {
    const [entry] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    return entry?.type;
  } catch {
    return undefined;
  }
}

/**
 * Every full page load starts on the same history key, so an entry recorded on an earlier
 * load of the same share link would look already followed, and opening that link again in
 * the tab wouldn't scroll. On a fresh `navigate` load (a link opened or pasted) those entries
 * are from earlier pages: forget them. A reload or Back/Forward keeps them, so it still lands
 * where the diner left off. Entries for other history keys are left alone.
 */
export function forgetLinksFollowedInEarlierPageLoads(
  type: NavigationTimingType | undefined = pageLoadType(),
): void {
  if (type !== "navigate") return;
  const entries = followedLinks.read();
  const kept = entries.filter(
    (entry) => !entry.startsWith(`${FIRST_ENTRY_KEY}#`),
  );
  if (kept.length !== entries.length) followedLinks.write(kept);
}

let pageLoadChecked = false;

/**
 * Follows a shared `#item-{guideItemId}` link: once the Guide's cards have rendered, scrolls
 * that card into view (smoothly, unless the diner prefers reduced motion) and returns its
 * Guide Item ID for {@link HIGHLIGHT_MS}, so the page can highlight it. Each history entry's
 * link is followed once, so neither a refetch nor coming Back to the page scrolls the diner
 * again. An unknown Guide Item is ignored: the page opens normally, at the top.
 *
 * @param guideItemIds The rendered cards' Guide Item IDs; `undefined` while the Guide loads.
 */
export function useGuideItemHashTarget(
  guideItemIds: readonly string[] | undefined,
): string | undefined {
  const { hash, key } = useLocation();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [highlight, setHighlight] = useState<{ id: string } | undefined>();

  useEffect(() => {
    if (!guideItemIds) return;
    const id = guideItemIdFromHash(hash);
    if (!id || !guideItemIds.includes(id)) return;
    if (!pageLoadChecked) {
      pageLoadChecked = true;
      forgetLinksFollowedInEarlierPageLoads();
    }
    const entry = `${key}${hash}`;
    if (followedLinks.has(entry)) return;
    followedLinks.add(entry);
    document.getElementById(itemAnchorId(id))?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    // A new object each time, so following the same card again restarts the highlight.
    setHighlight({ id });
  }, [guideItemIds, hash, key, reducedMotion]);

  useEffect(() => {
    if (!highlight) return;
    const timer = window.setTimeout(
      () => setHighlight(undefined),
      HIGHLIGHT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [highlight]);

  return highlight?.id;
}
