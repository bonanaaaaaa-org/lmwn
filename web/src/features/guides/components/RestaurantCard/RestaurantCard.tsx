import clsx from "clsx";
import { useId, useState, type ReactNode } from "react";
import { VisuallyHidden } from "react-aria";

import { Badge } from "@/components/common/Badge";
import {
  Button,
  ButtonLink,
  type ButtonLinkProps,
} from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { Rating } from "@/components/common/Rating";
import { PhotoStrip } from "@/features/guides/components/PhotoStrip";
import { formatPhoneNumber } from "@/features/guides/lib/format";
import {
  facebookUrl,
  instagramUrl,
  lineUrl,
  mapUrl,
  telHref,
} from "@/features/guides/lib/links";
import type { GuideItem, Restaurant } from "@/features/guides/lib/types";
import { joinTestId } from "@/lib/testIds";

import styles from "./RestaurantCard.module.css";

export type RestaurantCardLayout = "desktop" | "phone";

export interface RestaurantCardProps {
  /** The Guide Item: the editor's write-up and photos, plus its Restaurant (`null` when unavailable). */
  item: GuideItem;
  /** `desktop`: a rounded card. `phone`: full-bleed, details in a grey box, then a 2-column action grid. */
  layout?: RestaurantCardLayout;
  /** Position in the Guide, from 1. */
  index: number;
  /** Show the Unavailable Restaurant state. Defaults to whether the Restaurant failed to load. */
  unavailable?: boolean;
  /** Start with the write-up cut to about 4 lines, with "อ่านเพิ่มเติม" (read more) to expand it. */
  clamp?: boolean;
  className?: string;
  /** The page's test ID; the card is `{parent}/restaurant-card`. */
  parentTestId?: string;
}

// Thai vowels and tone marks above or below a consonant take no width of their own.
const THAI_COMBINING = /[ัิ-ฺ็-๎]/g;
/** Roughly 4 lines of write-up at each layout's measure. */
const CLAMP_AFTER_CHARS: Record<RestaurantCardLayout, number> = {
  desktop: 260,
  phone: 150,
};

/** Whether a write-up is long enough to need cutting to about 4 lines. */
export function needsClamp(
  writeUp: string,
  layout: RestaurantCardLayout,
): boolean {
  return (
    writeUp.replaceAll(THAI_COMBINING, "").length > CLAMP_AFTER_CHARS[layout]
  );
}

/** "ONIBUS COFFEE (สาขา One Bangkok)", with the branch styled apart. */
function RestaurantName({ restaurant }: { restaurant: Restaurant }) {
  return (
    <>
      {restaurant.name}
      {restaurant.branch && (
        <>
          {" "}
          <span className={styles.RestaurantCard__Branch}>
            (สาขา {restaurant.branch})
          </span>
        </>
      )}
    </>
  );
}

function Badges({
  restaurant,
  className,
}: {
  restaurant: Restaurant;
  className?: string;
}) {
  const badges = [
    {
      key: "official",
      show: restaurant.official,
      variant: "official",
      label: "Official",
    },
    {
      key: "delivery",
      show: restaurant.delivery,
      variant: "neutral",
      label: "เดลิเวอรี่",
    },
    {
      key: "pickup",
      show: restaurant.pickup,
      variant: "neutral",
      label: "รับเองที่ร้าน",
    },
  ] as const;
  const shown = badges.filter((badge) => badge.show);
  if (shown.length === 0) return null;
  return (
    <ul
      className={clsx(styles.RestaurantCard__Badges, className)}
      aria-label="บริการ"
    >
      {shown.map((badge) => (
        <li key={badge.key}>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** A link that leaves the app: opens in a new tab and says so to screen readers. */
function ExternalLink({
  children,
  ...props
}: ButtonLinkProps & { children: ReactNode }) {
  return (
    <ButtonLink {...props} target="_blank" rel="noopener noreferrer">
      {children}
      <VisuallyHidden> (เปิดในแท็บใหม่)</VisuallyHidden>
    </ButtonLink>
  );
}

interface Social {
  key: "line" | "instagram" | "facebook";
  label: string;
  href: string;
}

function socialsOf(restaurant: Restaurant): Social[] {
  const socials: Social[] = [];
  if (restaurant.line)
    socials.push({
      key: "line",
      label: "LINE",
      href: lineUrl(restaurant.line),
    });
  if (restaurant.instagram) {
    socials.push({
      key: "instagram",
      label: "Instagram",
      href: instagramUrl(restaurant.instagram),
    });
  }
  if (restaurant.facebook) {
    socials.push({
      key: "facebook",
      label: "Facebook",
      href: facebookUrl(restaurant.facebook),
    });
  }
  return socials;
}

/**
 * One Guide Item on the Guide page: the Restaurant's name, Rating, Categories and
 * badges, the photo strip, the editor's write-up, the address with a map link, and ways
 * to get in touch. An Unavailable Restaurant keeps its write-up and photos and says its
 * details couldn't be loaded.
 */
export function RestaurantCard({
  item,
  layout = "desktop",
  index,
  unavailable = item.restaurant === null,
  clamp = false,
  className,
  parentTestId,
}: RestaurantCardProps) {
  const testId = joinTestId(parentTestId, "restaurant-card");
  const nameId = useId();
  const writeUpId = useId();
  const [expanded, setExpanded] = useState(false);
  const restaurant = unavailable ? null : item.restaurant;
  const isDesktop = layout === "desktop";
  const socials = restaurant ? socialsOf(restaurant) : [];
  const phone = restaurant ? formatPhoneNumber(restaurant.phoneNo) : "";

  return (
    <article
      id={`item-${item.id}`}
      className={clsx(styles.RestaurantCard__Root, className)}
      data-layout={layout}
      data-state={restaurant ? undefined : "unavailable"}
      data-testid={testId}
      aria-labelledby={restaurant ? nameId : undefined}
    >
      {!restaurant && (
        <p className={styles.RestaurantCard__Unavailable}>
          <Icon name="alert" size={18} />
          ไม่สามารถโหลดข้อมูลร้านได้
        </p>
      )}

      {restaurant && (
        <div className={styles.RestaurantCard__Header}>
          <span className={styles.RestaurantCard__Index} aria-hidden="true">
            {index}
          </span>
          <div className={styles.RestaurantCard__Heading}>
            <h2 id={nameId} className={styles.RestaurantCard__Name}>
              <RestaurantName restaurant={restaurant} />
            </h2>
            <div className={styles.RestaurantCard__Meta}>
              <Rating
                rating={restaurant.rating}
                reviews={restaurant.numberOfReviews}
              />
              {restaurant.categories.length > 0 && (
                <>
                  <span
                    className={styles.RestaurantCard__Separator}
                    aria-hidden="true"
                  >
                    |
                  </span>
                  <span className={styles.RestaurantCard__Categories}>
                    {restaurant.categories.join(", ")}
                  </span>
                </>
              )}
              {isDesktop && <Badges restaurant={restaurant} />}
            </div>
          </div>
        </div>
      )}
      {restaurant && !isDesktop && (
        <Badges
          restaurant={restaurant}
          className={styles.RestaurantCard__Inset}
        />
      )}

      <PhotoStrip
        photos={item.photos}
        restaurantName={restaurant?.name}
        layout={layout}
        parentTestId={testId}
      />

      <div
        className={clsx(
          styles.RestaurantCard__WriteUp,
          styles.RestaurantCard__Inset,
        )}
      >
        <p
          id={writeUpId}
          className={styles.RestaurantCard__WriteUpText}
          data-clamped={clamp && !expanded ? "" : undefined}
        >
          {item.description}
        </p>
        {clamp && (
          <Button
            variant="text"
            aria-expanded={expanded}
            aria-controls={writeUpId}
            onPress={() => setExpanded((value) => !value)}
            testId={`${testId}/read-more`}
          >
            {expanded ? "แสดงน้อยลง" : "อ่านเพิ่มเติม"}
          </Button>
        )}
      </div>

      {restaurant && (
        <dl className={styles.RestaurantCard__Details}>
          <div className={styles.RestaurantCard__Detail}>
            <dt className={styles.RestaurantCard__Term}>ที่อยู่</dt>
            <dd>{restaurant.address}</dd>
            <dd>
              <ExternalLink
                variant="text"
                href={mapUrl(restaurant.lat, restaurant.lng)}
                testId={`${testId}/map`}
              >
                ดูแผนที่
                <Icon name="external" size={16} />
              </ExternalLink>
            </dd>
          </div>
          {isDesktop && (
            <div className={styles.RestaurantCard__Detail}>
              <dt className={styles.RestaurantCard__Term}>ติดต่อ</dt>
              <dd className={styles.RestaurantCard__Contacts}>
                <ButtonLink
                  variant="ghost"
                  size="compact"
                  href={telHref(restaurant.phoneNo)}
                  testId={`${testId}/call`}
                >
                  <Icon name="phone" size={16} />
                  <VisuallyHidden>โทร </VisuallyHidden>
                  {phone}
                </ButtonLink>
                {socials.map((social) => (
                  <ExternalLink
                    key={social.key}
                    variant="ghost"
                    size="compact"
                    href={social.href}
                    testId={`${testId}/${social.key}`}
                  >
                    {social.key === "instagram" && (
                      <Icon name="instagram" size={16} />
                    )}
                    {social.label}
                  </ExternalLink>
                ))}
                <ExternalLink
                  variant="ghost"
                  size="compact"
                  href={restaurant.url}
                  testId={`${testId}/wongnai`}
                >
                  ดูร้านบน Wongnai
                  <Icon name="external" size={14} />
                </ExternalLink>
              </dd>
            </div>
          )}
        </dl>
      )}

      {restaurant && !isDesktop && (
        <div
          className={clsx(
            styles.RestaurantCard__Actions,
            styles.RestaurantCard__Inset,
          )}
        >
          <ButtonLink
            variant="inverse"
            href={telHref(restaurant.phoneNo)}
            testId={`${testId}/call`}
          >
            <Icon name="phone" size={18} />
            โทร {phone}
          </ButtonLink>
          <ExternalLink
            variant="secondary"
            href={restaurant.url}
            testId={`${testId}/wongnai`}
          >
            ดูบน Wongnai
            <Icon name="external" size={14} />
          </ExternalLink>
          {socials.map((social) => (
            <ExternalLink
              key={social.key}
              variant="ghost"
              className={styles.RestaurantCard__WideAction}
              href={social.href}
              testId={`${testId}/${social.key}`}
            >
              {social.key === "instagram" && (
                <Icon name="instagram" size={18} />
              )}
              {social.label}
            </ExternalLink>
          ))}
        </div>
      )}
    </article>
  );
}
