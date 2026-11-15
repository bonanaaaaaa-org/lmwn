import clsx from "clsx";
import type { ReactNode } from "react";

import { Icon } from "@/components/common/Icon";

import styles from "./Badge.module.css";

export interface BadgeProps {
  /** `official` is the saffron-tinted badge with a badge check; `neutral` is grey. */
  variant?: "official" | "neutral";
  className?: string;
  children: ReactNode;
}

/** A small static label, e.g. "Official", delivery or pickup (`m.restaurantCard_badges_*`). */
export function Badge({
  variant = "neutral",
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={clsx(styles.Badge__Root, className)}
      data-variant={variant}
    >
      {variant === "official" && (
        <Icon name="badge-check" size={12} strokeWidth={2.6} />
      )}
      {children}
    </span>
  );
}
