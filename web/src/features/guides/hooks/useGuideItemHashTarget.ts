import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { guideItemIdFromHash, itemAnchorId } from "@/features/guides/lib/share";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** How long a shared card stays highlighted. */
export const HIGHLIGHT_MS = 2400;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const FOLLOWED_KEY = "gems:followed-item-links";
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
  add(entry: string): void {
    try {
      const entries = [...this.read(), entry].slice(-MAX_FOLLOWED);
      window.sessionStorage.setItem(FOLLOWED_KEY, JSON.stringify(entries));
    } catch {
      // Storage unavailable (private mode, quota): following again on Back is harmless.
    }
  },
};

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
