import clsx from "clsx";
import { Link } from "react-aria-components";

import styles from "./TagLink.module.css";

export interface TagLinkProps {
  /** The Tag text, exactly as the editor wrote it. */
  tag: string;
  className?: string;
}

/** The Guide Index URL filtered to one Tag. `URLSearchParams` encodes Thai and spaces. */
export function tagHref(tag: string): string {
  return `/?${new URLSearchParams({ tag }).toString()}`;
}

/** A Tag chip that opens the Guide Index filtered to that Tag. */
export function TagLink({ tag, className }: TagLinkProps) {
  return (
    <Link href={tagHref(tag)} className={clsx(styles.TagLink__Root, className)}>
      <span aria-hidden="true" className={styles.TagLink__Hash}>
        #
      </span>
      {tag}
    </Link>
  );
}
