import clsx from "clsx";

import { Skeleton } from "@/components/common/Skeleton";

import styles from "./SkeletonCard.module.css";

export interface SkeletonCardProps {
  /** Match the `GuideCard` layout it stands in for. */
  layout?: "desktop" | "phone";
  className?: string;
}

/**
 * A loading stand-in with the shape of a `GuideCard`: cover, count, title, description and
 * two Tags. Hidden from assistive tech; wrap the set in `SkeletonGroup` for one announcement.
 */
export function SkeletonCard({
  layout = "desktop",
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={clsx(styles.SkeletonCard__Root, className)}
      data-layout={layout}
      aria-hidden="true"
    >
      <Skeleton aspectRatio="16 / 10" className={styles.SkeletonCard__Cover} />
      <div className={styles.SkeletonCard__Body}>
        <Skeleton
          width="30%"
          height="0.75rem"
          className={styles.SkeletonCard__Bar}
        />
        <Skeleton
          width="85%"
          height="1rem"
          className={styles.SkeletonCard__Bar}
        />
        <Skeleton
          width="65%"
          height="0.75rem"
          className={styles.SkeletonCard__Bar}
        />
        <div className={styles.SkeletonCard__Tags}>
          <Skeleton
            width="3.5rem"
            height="1.5rem"
            className={styles.SkeletonCard__Tag}
          />
          <Skeleton
            width="3.5rem"
            height="1.5rem"
            className={styles.SkeletonCard__Tag}
          />
        </div>
      </div>
    </div>
  );
}
