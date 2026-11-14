import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button as AriaButton } from "react-aria-components";

import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { ResponsiveImage } from "@/components/common/ResponsiveImage";
import { Lightbox } from "@/features/guides/components/Lightbox";
import { photoAlt, photoSources } from "@/features/guides/lib/format";
import type { Photo } from "@/features/guides/lib/types";
import { joinTestId } from "@/lib/testIds";

import styles from "./PhotoStrip.module.css";

export interface PhotoStripProps {
  photos: readonly Photo[];
  /** Names the photos ("รูปที่ 1 จาก 3 ของ …"); absent for an Unavailable Restaurant. */
  restaurantName?: string;
  /** `desktop`: 3 square photos in view. `phone`: 4:5 photos at 78% width, the next one peeking in. */
  layout?: "desktop" | "phone";
  className?: string;
  /**
   * The card's test ID; the strip is `{parent}/photo-strip`, each photo `{parent}/photo-strip/photo`
   * and its button `{parent}/photo-strip/next`.
   */
  parentTestId?: string;
  /** The page's test ID: the lightbox is a page-level dialog, `{lightboxParentTestId}/lightbox`. */
  lightboxParentTestId?: string;
}

const PHOTOS_IN_VIEW = { desktop: 3, phone: 1 } as const;
const SIZES = {
  desktop: "(min-width: 75rem) 22rem, 30vw",
  phone: "78vw",
} as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A horizontal strip of a Guide Item's photos that snaps to each photo. It scrolls by
 * swipe or trackpad, and tabbing through the photos brings each into view; on desktop a
 * button pages through photos beyond the first three. Each photo is a button that opens
 * the lightbox on it. Missing or broken photos keep their box as a placeholder.
 */
export function PhotoStrip({
  photos,
  restaurantName,
  layout = "desktop",
  className,
  parentTestId,
  lightboxParentTestId,
}: PhotoStripProps) {
  const testId = joinTestId(parentTestId, "photo-strip");
  const listRef = useRef<HTMLUListElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(0);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const scrollable = list.scrollWidth > list.clientWidth + 1;
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

  const label = restaurantName ? `รูปภาพของ ${restaurantName}` : "รูปภาพ";

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
        onScroll={measure}
      >
        {photos.map((photo, index) => (
          // Upstream can reuse one photo ID for different photos, so the position is part of the key.
          <li key={`${index}:${photo.id}`} className={styles.PhotoStrip__Item}>
            {/* Named by its image's alt text; focus returns here when the lightbox closes. */}
            <AriaButton
              className={styles.PhotoStrip__PhotoButton}
              onPress={() => {
                setLightboxPhoto(index);
                setLightboxOpen(true);
              }}
              data-testid={`${testId}/photo`}
            >
              <ResponsiveImage
                className={styles.PhotoStrip__Photo}
                sources={photoSources(photo)}
                alt={photoAlt(index + 1, photos.length, restaurantName)}
                aspectRatio={layout === "desktop" ? "1 / 1" : "4 / 5"}
                sizes={SIZES[layout]}
              />
            </AriaButton>
          </li>
        ))}
      </ul>
      {showNext && (
        <Button
          className={styles.PhotoStrip__Next}
          variant="ghost"
          aria-label={atEnd ? "กลับไปรูปแรก" : "รูปถัดไป"}
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
      <Lightbox
        name={restaurantName}
        photos={photos}
        current={lightboxPhoto}
        onCurrentChange={setLightboxPhoto}
        isOpen={lightboxOpen}
        onOpenChange={setLightboxOpen}
        parentTestId={lightboxParentTestId}
      />
    </div>
  );
}
