import clsx from "clsx";

import { ResponsiveImage } from "@/components/common/ResponsiveImage";
import { ShareButton } from "@/components/common/ShareButton";
import { TagLink } from "@/components/common/TagLink";
import { HeaderSlotPortal } from "@/components/layout/Header";
import { photoSources } from "@/features/guides/lib/photos";
import type { Guide } from "@/features/guides/lib/types";
import { formatDate, toIsoDate } from "@/lib/format";
import type { ShareTarget } from "@/hooks/useShare";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./GuideHeader.module.css";

export interface GuideHeaderProps {
  guide: Pick<
    Guide,
    | "title"
    | "description"
    | "coverPhoto"
    | "tags"
    | "writeDate"
    | "timeZone"
    | "items"
  >;
  /** `desktop`: a rounded 21:9 cover. `phone`: a full-bleed 4:3 cover. */
  layout?: "desktop" | "phone";
  /**
   * Sharing the whole Guide. On desktop the `m.guideHeader_share_label()` button sits beside the title; on a
   * phone an icon button goes in the app header (see `HeaderSlotPortal`). Omit for no button.
   */
  share?: ShareTarget;
  className?: string;
  /**
   * The page's test ID; the header is `{parent}/guide-header`, each Tag
   * `{parent}/guide-header/tag` and the share button `{parent}/guide-header/share`.
   */
  parentTestId?: string;
}

/**
 * The top of a Guide: cover, Tags linking to the Guide Index, title, date written and
 * description, and a share button.
 */
export function GuideHeader({
  guide,
  layout = "desktop",
  share,
  className,
  parentTestId,
}: GuideHeaderProps) {
  const testId = joinTestId(parentTestId, "guide-header");
  const shareTestId = `${testId}/share`;
  return (
    <header
      className={clsx(styles.GuideHeader__Root, className)}
      data-layout={layout}
      data-testid={testId}
    >
      <ResponsiveImage
        className={styles.GuideHeader__Cover}
        sources={photoSources(guide.coverPhoto)}
        alt={guide.title}
        aspectRatio={layout === "desktop" ? "21 / 9" : "4 / 3"}
        sizes="(min-width: 75rem) 70rem, 100vw"
        priority
      />
      <div className={styles.GuideHeader__Intro}>
        <div className={styles.GuideHeader__Body}>
          {guide.tags.length > 0 && (
            <ul
              className={styles.GuideHeader__Tags}
              aria-label={m.guideHeader_tags_ariaLabel()}
            >
              {guide.tags.map((tag) => (
                <li key={tag}>
                  <TagLink
                    tag={tag}
                    variant="filled"
                    testId={`${testId}/tag`}
                  />
                </li>
              ))}
            </ul>
          )}
          <h1 className={styles.GuideHeader__Title}>{guide.title}</h1>
          <p className={styles.GuideHeader__Meta}>
            {m.guideHeader_writeDate_label()}{" "}
            <time dateTime={toIsoDate(guide.writeDate, guide.timeZone)}>
              {formatDate(guide.writeDate, { timeZone: guide.timeZone })}
            </time>{" "}
            ·{" "}
            {m.guideHeader_restaurantCount_body({ count: guide.items.length })}
          </p>
          <p className={styles.GuideHeader__Description}>{guide.description}</p>
        </div>
        {share && layout === "desktop" && (
          <ShareButton
            target={share}
            label={m.guideHeader_share_label()}
            variant="primary"
            className={styles.GuideHeader__Share}
            testId={shareTestId}
          />
        )}
      </div>
      {share && layout === "phone" && (
        <HeaderSlotPortal>
          <ShareButton
            target={share}
            label={m.guideHeader_share_label()}
            variant="text"
            iconOnly
            testId={shareTestId}
          />
        </HeaderSlotPortal>
      )}
    </header>
  );
}
