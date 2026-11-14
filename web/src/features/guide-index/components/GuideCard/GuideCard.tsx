import clsx from "clsx";
import { Link } from "react-aria-components";

import {
  ResponsiveImage,
  type ImageSource,
} from "@/components/common/ResponsiveImage";
import {
  TagLink,
  tagHref as defaultTagHref,
} from "@/components/common/TagLink";
import { GUIDE_CARD_SIZES } from "@/lib/coverSizes";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./GuideCard.module.css";

export interface GuideCardGuide {
  title: string;
  /** How many restaurants (Guide Items) the Guide has. */
  count: number;
  description: string;
  /** `srcset` candidates for the cover; empty shows the placeholder. */
  cover: readonly ImageSource[];
  tags: readonly string[];
  /** The Guide's page. */
  href: string;
}

export interface GuideCardProps {
  guide: GuideCardGuide;
  /** `desktop` (24px padding, 20px title) or `phone` (16px padding, 18px title). */
  layout?: "desktop" | "phone";
  /** Where a Tag goes; defaults to the Guide Index filtered to that Tag alone. */
  tagHref?: (tag: string) => string;
  /** Load the cover eagerly at high priority (the first card, above the fold). */
  priority?: boolean;
  /** The cover's `sizes`; defaults to the Guide Index grid. */
  sizes?: string;
  className?: string;
  /** The parent's test ID; the card is `{parent}/guide-card`, with `/link` and `/tag` inside. */
  parentTestId?: string;
}

/**
 * A Guide in the Guide Index. The title link is stretched over the whole card, and the Tags,
 * later in the DOM and positioned, sit on top of it so they stay separately clickable.
 */
export function GuideCard({
  guide,
  layout = "desktop",
  tagHref = defaultTagHref,
  priority = false,
  sizes = GUIDE_CARD_SIZES,
  className,
  parentTestId,
}: GuideCardProps) {
  const testId = joinTestId(parentTestId, "guide-card");
  return (
    <article
      className={clsx(styles.GuideCard__Root, className)}
      data-layout={layout}
      data-testid={testId}
    >
      {/* The spec: a Guide's cover is described by its title. */}
      <ResponsiveImage
        className={styles.GuideCard__Cover}
        sources={guide.cover}
        alt={guide.title}
        aspectRatio="16 / 10"
        sizes={sizes}
        priority={priority}
      />
      <div className={styles.GuideCard__Body}>
        <p className={styles.GuideCard__Count}>
          {m.guideCard_restaurantCount_body({ count: guide.count })}
        </p>
        <h3 className={styles.GuideCard__Title}>
          <Link
            href={guide.href}
            className={styles.GuideCard__Link}
            data-testid={`${testId}/link`}
          >
            <span aria-hidden="true" className={styles.GuideCard__Stretch} />
            {guide.title}
          </Link>
        </h3>
        <p className={styles.GuideCard__Description}>{guide.description}</p>
        {guide.tags.length > 0 && (
          <ul className={styles.GuideCard__Tags}>
            {guide.tags.map((tag) => (
              <li key={tag} className={styles.GuideCard__Tag}>
                <TagLink
                  tag={tag}
                  href={tagHref(tag)}
                  variant="filled"
                  testId={`${testId}/tag`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
