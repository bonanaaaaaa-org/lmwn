import clsx from "clsx";

import {
  Button,
  ButtonLink,
  type ButtonVariant,
} from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { joinTestId } from "@/lib/testIds";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** A short line above the title, e.g. "0 of 10 restaurants". */
  meta?: string;
  /** Show the search icon above the title. */
  icon?: boolean;
  /** The action's label, e.g. "clear search". No label, no action. */
  actionLabel?: string;
  actionVariant?: Extract<ButtonVariant, "primary" | "secondary">;
  /** A button action… */
  onAction?: () => void;
  /** …or a link action (wins over `onAction`). */
  actionHref?: string;
  /** Heading level for `title`. */
  headingLevel?: 2 | 3;
  className?: string;
  /** The parent's test ID; the panel is `{parent}/empty-state`, its action `{parent}/empty-state/action`. */
  parentTestId?: string;
}

/** Explains why there is nothing to show and offers the way out. */
export function EmptyState({
  title,
  description,
  meta,
  icon = true,
  actionLabel,
  actionVariant = "secondary",
  onAction,
  actionHref,
  headingLevel = 2,
  className,
  parentTestId,
}: EmptyStateProps) {
  const testId = joinTestId(parentTestId, "empty-state");
  const Heading = `h${headingLevel}` as const;
  const actionTestId = `${testId}/action`;
  return (
    <section
      className={clsx(styles.EmptyState__Root, className)}
      data-testid={testId}
    >
      {icon && (
        <span className={styles.EmptyState__Icon}>
          <Icon name="search" size={40} strokeWidth={1.6} />
        </span>
      )}
      {meta && <p className={styles.EmptyState__Meta}>{meta}</p>}
      <Heading className={styles.EmptyState__Title}>{title}</Heading>
      {description && (
        <p className={styles.EmptyState__Description}>{description}</p>
      )}
      {actionLabel && actionHref && (
        <ButtonLink
          className={styles.EmptyState__Action}
          href={actionHref}
          variant={actionVariant}
          testId={actionTestId}
        >
          {actionLabel}
        </ButtonLink>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button
          className={styles.EmptyState__Action}
          onPress={onAction}
          variant={actionVariant}
          testId={actionTestId}
        >
          {actionLabel}
        </Button>
      )}
    </section>
  );
}
