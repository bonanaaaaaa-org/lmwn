import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { ResponsiveImage } from "@/components/common/ResponsiveImage";
import { photoSources } from "@/features/guides/lib/photos";
import type { Photo } from "@/features/guides/lib/types";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./PhotoStrip.module.css";

export interface PhotoStripProps {
  photos: readonly Photo[];
  /** Names the photos (`m.restaurantCard_photoStrip_photo_alt()`); absent for an Unavailable Restaurant. */
  restaurantName?: string;
  /** `desktop`: 3 square photos in view. `phone`: 4:5 photos at 78% width, the next one peeking in. */
  layout?: "desktop" | "phone";
  className?: string;
  /** The card's test ID; the strip is `{parent}/photo-strip`, its button `{parent}/photo-strip/next`. */
  parentTestId?: string;
}

const PHOTOS_IN_VIEW = { desktop: 3, phone: 1 } as const;
const SIZES = {
  desktop: "(min-width: 75rem) 22rem, 30vw",
  phone: "78vw",
} as const;

/** Photo `position` (from 1) of `total`, named by the Restaurant when it is known. */
function photoAlt(position: number, total: number, restaurant?: string) {
  return restaurant
    ? m.restaurantCard_photoStrip_photo_alt({ position, total, restaurant })
    : m.restaurantCard_photoStrip_photo_unnamedAlt({ position, total });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A horizontal strip of a Guide Item's photos that snaps to each photo. It scrolls by
 * swipe, trackpad or (once focused) the arrow keys; on desktop a button pages through
 * photos beyond the first three. Missing or broken photos keep their box as a placeholder.
 */
export function PhotoStrip({
  photos,
  restaurantName,
  layout = "desktop",
  className,
  parentTestId,
}: PhotoStripProps) {
  const testId = joinTestId(parentTestId, "photo-strip");
  const listRef = useRef<HTMLUListElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const scrollable = list.scrollWidth > list.clientWidth + 1;
    setOverflows(scrollable);
    setAtEnd(
      scrollable && list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  const showNext =
    layout === "desktop" && photos.length > PHOTOS_IN_VIEW.desktop;

  const page = () => {
    const list = listRef.current;
    if (!list || typeof list.scrollTo !== "function") return;
    list.scrollTo({
      left: atEnd ? 0 : list.scrollLeft + list.clientWidth,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const label = restaurantName
    ? m.restaurantCard_photoStrip_ariaLabel({ restaurant: restaurantName })
    : m.restaurantCard_photoStrip_unnamedAriaLabel();

  return (
    <div
      className={clsx(styles.PhotoStrip__Root, className)}
      data-layout={layout}
      data-testid={testId}
    >
      <ul
        ref={listRef}
        className={styles.PhotoStrip__List}
        aria-label={label}
        // A scrolling region must be reachable by keyboard so it can be scrolled with the
        // arrow keys (WCAG 2.1.1; axe `scrollable-region-focusable`). Until the photos become
        // buttons (lightbox, #12) nothing inside it can take focus.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={overflows ? 0 : undefined}
        onScroll={measure}
      >
        {photos.map((photo, index) => (
          // Upstream can reuse one photo ID for different photos, so the position is part of the key.
          <li key={`${index}:${photo.id}`} className={styles.PhotoStrip__Item}>
            <ResponsiveImage
              className={styles.PhotoStrip__Photo}
              sources={photoSources(photo)}
              alt={photoAlt(index + 1, photos.length, restaurantName)}
              aspectRatio={layout === "desktop" ? "1 / 1" : "4 / 5"}
              sizes={SIZES[layout]}
            />
          </li>
        ))}
      </ul>
      {showNext && (
        <Button
          className={styles.PhotoStrip__Next}
          variant="ghost"
          aria-label={
            atEnd
              ? m.restaurantCard_photoStrip_next_atEndAriaLabel()
              : m.restaurantCard_photoStrip_next_ariaLabel()
          }
          onPress={page}
          testId={`${testId}/next`}
        >
          <Icon
            name={atEnd ? "chevron-left" : "chevron-right"}
            size={20}
            strokeWidth={2.2}
          />
        </Button>
      )}
    </div>
  );
}
