import clsx from "clsx";
import { Link } from "react-aria-components";

import { useTestId } from "@/lib/testIds";

import styles from "./TagLink.module.css";

export interface TagLinkProps {
  /** The Tag text, exactly as the editor wrote it. */
  tag: string;
  /**
   * Where the chip goes. Defaults to `tagHref(tag)`; the Guide Index passes its own URL
   * so a Tag can combine with the current search text and other Tags.
   */
  href?: string;
  className?: string;
}

/** The Guide Index URL filtered to one Tag. `URLSearchParams` encodes Thai and spaces. */
export function tagHref(tag: string): string {
  return `/?${new URLSearchParams({ tag }).toString()}`;
}

/** A Tag chip that opens the Guide Index filtered to that Tag. */
export function TagLink({ tag, href, className }: TagLinkProps) {
  const testIdFor = useTestId();
  return (
    <Link
      href={href ?? tagHref(tag)}
      className={clsx(styles.TagLink__Root, className)}
      data-testid={testIdFor("tag")}
    >
      <span aria-hidden="true" className={styles.TagLink__Hash}>
        #
      </span>
      {tag}
    </Link>
  );
}
