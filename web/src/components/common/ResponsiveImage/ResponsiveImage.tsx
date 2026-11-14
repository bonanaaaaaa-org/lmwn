import clsx from "clsx";
import { useState, type CSSProperties } from "react";

import styles from "./ResponsiveImage.module.css";

export interface ImageSource {
  url: string;
  /** Intrinsic width in pixels, used for the `srcset` width descriptor. */
  width: number;
}

export interface ResponsiveImageProps {
  /** Candidates for `srcset`, e.g. the gateway's small and large URLs. Empty URLs are ignored. */
  sources: readonly ImageSource[];
  /** Describes the image; an empty string marks it decorative. */
  alt: string;
  /** The box the image fills, e.g. "16 / 9". Reserved before load, so nothing shifts. */
  aspectRatio: string;
  /** The `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes?: string;
  /** For the above-the-fold hero (LCP): load eagerly at high priority instead of lazily. */
  priority?: boolean;
  className?: string;
}

function toSrcSet(sources: readonly ImageSource[]): string {
  return sources.map(({ url, width }) => `${url} ${width}w`).join(", ");
}

/**
 * An image in a fixed-ratio box. If there is no URL, or the image fails or is empty
 * (the image server answers a missing image with 200 and an empty body, which the
 * browser reports as a load error), a placeholder fills the same box instead.
 */
export function ResponsiveImage({
  sources,
  alt,
  aspectRatio,
  sizes = "100vw",
  priority = false,
  className,
}: ResponsiveImageProps) {
  const usable = sources.filter(({ url }) => url.trim() !== "");
  const srcSet = toSrcSet(usable);
  // Remember which srcset failed, so new sources get a fresh attempt without an effect.
  const [failedSrcSet, setFailedSrcSet] = useState<string | null>(null);
  const showPlaceholder = usable.length === 0 || failedSrcSet === srcSet;
  const style = { "--image-aspect-ratio": aspectRatio } as CSSProperties;

  if (showPlaceholder) {
    return (
      <span
        className={clsx(styles.ResponsiveImage__Root, className)}
        style={style}
        data-state="placeholder"
        {...(alt
          ? { role: "img", "aria-label": alt }
          : { "aria-hidden": true })}
      >
        <svg
          className={styles.ResponsiveImage__Icon}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9.6l3.3-3.3a1 1 0 0 1 1.4 0l2.3 2.3 4.3-4.3a1 1 0 0 1 1.4 0L19 11.6V6H5Zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={clsx(styles.ResponsiveImage__Root, className)}
      style={style}
      data-state="image"
    >
      <img
        className={styles.ResponsiveImage__Img}
        src={usable[0]?.url}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "auto" : "async"}
        onError={() => setFailedSrcSet(srcSet)}
        onLoad={(event) => {
          // Belt and braces: an empty body that still "loads" has no pixels.
          if (event.currentTarget.naturalWidth === 0) setFailedSrcSet(srcSet);
        }}
      />
    </span>
  );
}
