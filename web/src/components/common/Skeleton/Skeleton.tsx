import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { VisuallyHidden } from "react-aria";

import { m } from "@/paraglide/messages.js";
import type { Radius } from "@/styles/radius";

import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  /** `text` renders `lines` bars at text height (the last one shorter); `block` and `circle` render one shape. */
  shape?: "block" | "text" | "circle";
  /** Any CSS length, e.g. "12rem" or "60%". Defaults to the full width (circle: 2.5rem). */
  width?: string;
  /** Any CSS length. Ignored when `aspectRatio` is set. */
  height?: string;
  /** Reserve the exact box of an image, e.g. "4 / 3". */
  aspectRatio?: string;
  /** Number of text lines when `shape="text"`. */
  lines?: number;
  /** Corner radius token. Defaults to the shape's own (block 200, text 100, circle round). */
  radius?: Radius;
  className?: string;
}

/**
 * A placeholder shape that reserves the layout of content that is still loading.
 * Purely visual (`aria-hidden`); wrap a page's skeletons in `SkeletonGroup` so screen
 * readers hear one "loading" announcement instead.
 */
export function Skeleton({
  shape = "block",
  width,
  height,
  aspectRatio,
  lines = 1,
  radius,
  className,
}: SkeletonProps) {
  const style = {
    "--skeleton-width": width,
    "--skeleton-height": aspectRatio ? undefined : height,
    "--skeleton-aspect-ratio": aspectRatio,
  } as CSSProperties;

  if (shape === "text") {
    return (
      <span
        className={clsx(styles.Skeleton__Lines, className)}
        style={style}
        aria-hidden="true"
      >
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={styles.Skeleton__Root}
            data-shape="text"
            data-radius={radius}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={clsx(styles.Skeleton__Root, className)}
      data-shape={shape}
      data-radius={radius}
      data-fixed-ratio={aspectRatio ? "" : undefined}
      style={style}
      aria-hidden="true"
    />
  );
}

export interface SkeletonGroupProps {
  /** What screen readers hear while this region loads. Defaults to `m.skeletonGroup_label()`. */
  label?: string;
  className?: string;
  children: ReactNode;
}

/** Marks a loading region: announces `label` once, hides the skeleton shapes from assistive tech. */
export function SkeletonGroup({
  label,
  className,
  children,
}: SkeletonGroupProps) {
  return (
    <div className={className} role="status">
      <VisuallyHidden>{label ?? m.skeletonGroup_label()}</VisuallyHidden>
      {children}
    </div>
  );
}
