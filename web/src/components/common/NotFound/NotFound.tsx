import clsx from "clsx";

import { ButtonLink } from "@/components/common/Button";
import { joinTestId } from "@/lib/testIds";

import styles from "./NotFound.module.css";

export interface NotFoundProps {
  /** e.g. "ไม่พบไกด์นี้" (guide not found) for an unknown Guide. */
  title?: string;
  description?: string;
  className?: string;
  /** The parent's test ID; the section is `{parent}/not-found`, its link `{parent}/not-found/back-link`. */
  parentTestId?: string;
}

/** The page shown for a 404: says what's missing and links back to the Guide Index. */
export function NotFound({
  title = "ไม่พบหน้านี้",
  description = "ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกลบไปแล้ว",
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
      <h1 className={styles.NotFound__Title}>{title}</h1>
      <p className={styles.NotFound__Description}>{description}</p>
      <ButtonLink href="/" testId={`${testId}/back-link`}>
        กลับไปหน้าไกด์ทั้งหมด
      </ButtonLink>
    </section>
  );
}
