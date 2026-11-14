import { useEffect, useRef, useState } from "react";

import { guideItemIdFromHash, itemAnchorId } from "@/features/guides/lib/share";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** How long a shared card stays highlighted. */
export const HIGHLIGHT_MS = 2400;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useLocationHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash;
}

/**
 * Follows a shared `#item-{guideItemId}` link: once the Guide's cards have rendered, scrolls
 * that card into view (smoothly, unless the diner prefers reduced motion) and returns its
 * Guide Item ID for {@link HIGHLIGHT_MS}, so the page can highlight it. Each hash is followed
 * once, so a refetch never scrolls the diner back. An unknown Guide Item is ignored: the page
 * opens normally, at the top.
 *
 * @param guideItemIds The rendered cards' Guide Item IDs; `undefined` while the Guide loads.
 */
export function useGuideItemHashTarget(
  guideItemIds: readonly string[] | undefined,
): string | undefined {
  const hash = useLocationHash();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const followed = useRef<string | null>(null);
  const [highlight, setHighlight] = useState<{ id: string } | undefined>();

  useEffect(() => {
    if (!guideItemIds || followed.current === hash) return;
    followed.current = hash;
    const id = guideItemIdFromHash(hash);
    if (!id || !guideItemIds.includes(id)) return;
    document.getElementById(itemAnchorId(id))?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    // A new object each time, so following the same card again restarts the highlight.
    setHighlight({ id });
  }, [guideItemIds, hash, reducedMotion]);

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
