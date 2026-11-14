import clsx from "clsx";

import { Skeleton, SkeletonGroup } from "@/components/common/Skeleton";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./GuidePageSkeleton.module.css";

export interface GuidePageSkeletonProps {
  layout?: "desktop" | "phone";
  className?: string;
  /** The page's test ID; the skeleton is `{parent}/skeleton`. */
  parentTestId?: string;
}

function CardSkeleton({ layout }: { layout: "desktop" | "phone" }) {
  const photos = layout === "desktop" ? 3 : 2;
  return (
    <div className={styles.GuidePageSkeleton__Card}>
      <div className={styles.GuidePageSkeleton__CardHeader}>
        <Skeleton shape="circle" width="2rem" />
        <div className={styles.GuidePageSkeleton__Stack}>
          <Skeleton width="55%" height="1.75rem" />
          <Skeleton width="35%" height="1rem" />
        </div>
      </div>
      <div className={styles.GuidePageSkeleton__Strip}>
        {Array.from({ length: photos }, (_, index) => (
          <Skeleton
            key={index}
            aspectRatio={layout === "desktop" ? "1 / 1" : "4 / 5"}
          />
        ))}
      </div>
      <div className={styles.GuidePageSkeleton__Inset}>
        <Skeleton shape="text" lines={3} />
      </div>
    </div>
  );
}

/** The Guide page while it loads: the header and two cards, in the same boxes as the real page. */
export function GuidePageSkeleton({
  layout = "desktop",
  className,
  parentTestId,
}: GuidePageSkeletonProps) {
  return (
    <SkeletonGroup
      label={m.guide_skeleton_label()}
      className={clsx(styles.GuidePageSkeleton__Root, className)}
    >
      <div
        className={styles.GuidePageSkeleton__Layout}
        data-layout={layout}
        data-testid={joinTestId(parentTestId, "skeleton")}
      >
        <div className={styles.GuidePageSkeleton__Header}>
          <Skeleton
            className={styles.GuidePageSkeleton__Cover}
            aspectRatio={layout === "desktop" ? "21 / 9" : "4 / 3"}
          />
          <div className={styles.GuidePageSkeleton__Stack}>
            <div className={styles.GuidePageSkeleton__Row}>
              <Skeleton width="4rem" height="2rem" />
              <Skeleton width="5rem" height="2rem" />
              <Skeleton width="4.5rem" height="2rem" />
            </div>
            <Skeleton width="70%" height="2.75rem" />
            <Skeleton width="12rem" height="1rem" />
            <Skeleton shape="text" lines={2} />
          </div>
        </div>
        <CardSkeleton layout={layout} />
        <CardSkeleton layout={layout} />
      </div>
    </SkeletonGroup>
  );
}
