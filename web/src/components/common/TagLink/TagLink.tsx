import clsx from "clsx";
import { Link, type LinkProps } from "react-aria-components";

import { Icon, type IconName } from "@/components/common/Icon";

import styles from "./TagLink.module.css";

export interface TagLinkProps {
  /** The Tag text, exactly as the editor wrote it. */
  tag: string;
  /**
   * Where the chip goes. Defaults to `tagHref(tag)`; the Guide Index passes its own URL
   * so a Tag can combine with the current search text and other Tags.
   */
  href?: string;
  /** `outline` (40px, the Guide Index) or `filled` (32px grey chip, the Guide header). */
  variant?: "outline" | "filled";
  /** Show the leading "#" (Tags). Off for chips that aren't Tags, e.g. a Category or a badge. */
  hash?: boolean;
  /** A leading icon, e.g. `badge-check` for the Official badge. */
  icon?: IconName;
  /**
   * The filter this chip turns on is already on: `aria-current`, the saffron fill and
   * weight 600, with no check (like a selected `FilterTag`). Pressing it turns the filter off.
   */
  isSelected?: boolean;
  /** Overrides the visible text as the accessible name; keep the visible text in it. */
  "aria-label"?: string;
  /** React Router options for the navigation, e.g. `{ preventScrollReset: true }`. */
  routerOptions?: LinkProps["routerOptions"];
  className?: string;
  /** The finished `data-testid` from the parent, e.g. `guide-index/guide-card/tag`. */
  testId?: string;
}

/** The Guide Index URL filtered to one Tag. `URLSearchParams` encodes Thai and spaces. */
export function tagHref(tag: string): string {
  return `/?${new URLSearchParams({ tag }).toString()}`;
}

/** A Tag chip that opens the Guide Index filtered to that Tag (or any filter chip link). */
export function TagLink({
  tag,
  href,
  variant = "outline",
  hash = true,
  icon,
  isSelected = false,
  "aria-label": ariaLabel,
  routerOptions,
  className,
  testId,
}: TagLinkProps) {
  return (
    <Link
      href={href ?? tagHref(tag)}
      routerOptions={routerOptions}
      aria-label={ariaLabel}
      aria-current={isSelected ? "true" : undefined}
      className={clsx(styles.TagLink__Root, className)}
      data-variant={variant}
      data-selected={isSelected ? "" : undefined}
      data-testid={testId}
    >
      {hash && (
        <span aria-hidden="true" className={styles.TagLink__Hash}>
          #
        </span>
      )}
      {icon && <Icon name={icon} size={12} strokeWidth={2.6} />}
      {tag}
    </Link>
  );
}
