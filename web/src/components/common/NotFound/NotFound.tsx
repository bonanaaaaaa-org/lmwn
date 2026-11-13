import clsx from "clsx";

import { ButtonLink } from "@/components/common/Button";

import styles from "./NotFound.module.css";

export interface NotFoundProps {
  /** e.g. "ไม่พบไกด์นี้" (guide not found) for an unknown Guide. */
  title?: string;
  description?: string;
  className?: string;
}

/** The page shown for a 404: says what's missing and links back to the Guide Index. */
export function NotFound({
  title = "ไม่พบหน้านี้",
  description = "ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกลบไปแล้ว",
  className,
}: NotFoundProps) {
  return (
    <section className={clsx(styles.NotFound__Root, className)}>
      <p className={styles.NotFound__Code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.NotFound__Title}>{title}</h1>
      <p className={styles.NotFound__Description}>{description}</p>
      <ButtonLink href="/">กลับไปหน้ารวมไกด์</ButtonLink>
    </section>
  );
}
