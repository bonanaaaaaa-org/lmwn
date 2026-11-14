import clsx from "clsx";

import { formatRating } from "@/lib/format";
import { m } from "@/paraglide/messages.js";

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
 * A Rating, always with its review count: a star, the score to one decimal and
 * `m.rating_reviews_body()`, read out as `m.rating_ariaLabel()`. An Unrated Restaurant shows
 * `m.rating_unrated_label()` instead of stars.
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
        {m.rating_unrated_label()}
      </span>
    );
  }
  const score = formatRating(rating);
  return (
    <span
      className={clsx(styles.Rating__Root, className)}
      data-state="rated"
      role="img"
      aria-label={m.rating_ariaLabel({ rating: score, count: reviews })}
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
      <span className={styles.Rating__Reviews}>
        · {m.rating_reviews_body({ count: reviews })}
      </span>
    </span>
  );
}
