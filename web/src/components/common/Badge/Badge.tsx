import clsx from "clsx";
import type { ReactNode } from "react";

import { Icon } from "@/components/common/Icon";

import styles from "./Badge.module.css";

export interface BadgeProps {
  /** `official` is the saffron-tinted badge with a check; `neutral` is grey. */
  variant?: "official" | "neutral";
  className?: string;
  children: ReactNode;
}

/** A small static label, e.g. "Official", "เดลิเวอรี่" (delivery), "รับเองที่ร้าน" (pickup). */
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
        <Icon name="check" size={12} strokeWidth={2.6} />
      )}
      {children}
    </span>
  );
}
