import clsx from "clsx";

import styles from "./Rating.module.css";

export interface RatingProps {
  /** Average stars, 0–5. */
  rating: number;
  /** Number of reviews. 0 means an Unrated Restaurant, whatever `rating` says. */
  reviews: number;
  className?: string;
}

const STAR =
  "m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/**
 * A Rating, always with its review count: "★ 4.3 · 6 รีวิว", read out as
 * "4.3 จาก 5 ดาว, 6 รีวิว". An Unrated Restaurant shows "ยังไม่มีรีวิว" instead of stars.
 */
export function Rating({ rating, reviews, className }: RatingProps) {
  if (reviews === 0) {
    return (
      <span
        className={clsx(styles.Rating__Root, className)}
        data-state="unrated"
      >
        <svg
          className={styles.Rating__Star}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d={STAR} />
        </svg>
        ยังไม่มีรีวิว
      </span>
    );
  }
  const score = rating.toFixed(1);
  return (
    <span
      className={clsx(styles.Rating__Root, className)}
      data-state="rated"
      role="img"
      aria-label={`${score} จาก 5 ดาว, ${reviews} รีวิว`}
    >
      <svg
        className={styles.Rating__Star}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d={STAR} />
      </svg>
      <strong className={styles.Rating__Score}>{score}</strong>
      <span className={styles.Rating__Reviews}>· {reviews} รีวิว</span>
    </span>
  );
}
