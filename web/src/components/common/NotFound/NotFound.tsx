import clsx from "clsx";

import { ButtonLink } from "@/components/common/Button";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./NotFound.module.css";

export interface NotFoundProps {
  /** What is missing, e.g. "guide not found" for an unknown Guide. Defaults to `m.notFound_title()`. */
  title?: string;
  /** Defaults to `m.notFound_body()`. */
  description?: string;
  className?: string;
  /** The parent's test ID; the section is `{parent}/not-found`, its link `{parent}/not-found/back-link`. */
  parentTestId?: string;
}

/** The page shown for a 404: says what's missing and links back to the Guide Index. */
export function NotFound({
  title,
  description,
  className,
  parentTestId,
}: NotFoundProps) {
  const testId = joinTestId(parentTestId, "not-found");
  return (
    <section
      className={clsx(styles.NotFound__Root, className)}
      data-testid={testId}
    >
      <p className={styles.NotFound__Code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.NotFound__Title}>{title ?? m.notFound_title()}</h1>
      <p className={styles.NotFound__Description}>
        {description ?? m.notFound_body()}
      </p>
      <ButtonLink href="/" testId={`${testId}/back-link`}>
        {m.notFound_backLink_label()}
      </ButtonLink>
    </section>
  );
}
