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
import { ShareButton } from "@/components/common/ShareButton";
import { TagLink } from "@/components/common/TagLink";
import { PhotoStrip } from "@/features/guides/components/PhotoStrip";
import { WorkingHours } from "@/features/guides/components/WorkingHours";
import {
  facebookUrl,
  instagramUrl,
  lineUrl,
  mapUrl,
  safeWebUrl,
  telHref,
} from "@/features/guides/lib/links";
import {
  isRestaurantFilterOn,
  toggleRestaurantFilter,
  type RestaurantFilters,
  type RestaurantFilterToggle,
} from "@/features/guides/lib/restaurantFilters";
import {
  THAILAND_TIME_ZONE,
  type GuideItem,
  type Restaurant,
} from "@/features/guides/lib/types";
import type { ShareTarget } from "@/hooks/useShare";
import { formatPhoneNumber } from "@/lib/format";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./RestaurantCard.module.css";

export type RestaurantCardLayout = "desktop" | "phone";

export interface RestaurantCardProps {
  /** The Guide Item: the editor's write-up and photos, plus its Restaurant (`null` when unavailable). */
  item: GuideItem;
  /** `desktop`: a rounded card. `phone`: full-bleed, details in a grey box, then a 2-column action grid. */
  layout?: RestaurantCardLayout;
  /** Position in the Guide, from 1. */
  index: number;
  /** The Guide's `timeZone`, in which Working Hours and Open Now are read. */
  timeZone?: string;
  /** Show the Unavailable Restaurant state. Defaults to whether the Restaurant failed to load. */
  unavailable?: boolean;
  /** Start with the write-up cut to about 4 lines, with `m.restaurantCard_readMore_label()` to expand it. */
  clamp?: boolean;
  /** Sharing this card: an icon button beside the name. Not shown for an Unavailable Restaurant. */
  share?: ShareTarget;
  /** Opened from a shared link: a saffron ring that doesn't move the card. */
  highlighted?: boolean;
  /** The Guide page's current filters; with `filtersHref`, Categories and badges become filter links. */
  filters?: RestaurantFilters;
  /**
   * The Guide page URL for a set of filters (the toolbar's URL). Given it, each Category chip
   * and badge links to `filters` with its own filter toggled, and shows as selected while on.
   */
  filtersHref?: (filters: RestaurantFilters) => string;
  className?: string;
  /** The page's test ID; the card is `{parent}/restaurant-card`, its share button `…/share`. */
  parentTestId?: string;
}

// Thai vowels and tone marks above or below a consonant take no width of their own.
// U+0E31, U+0E34–U+0E3A and U+0E47–U+0E4E (escaped: no Thai literals in code).
const THAI_COMBINING = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;
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

/** The name, then `m.restaurantCard_branch_body()` for the branch, styled apart. */
function RestaurantName({ restaurant }: { restaurant: Restaurant }) {
  return (
    <>
      {restaurant.name}
      {restaurant.branch && (
        <>
          {" "}
          <span className={styles.RestaurantCard__Branch}>
            {m.restaurantCard_branch_body({ branch: restaurant.branch })}
          </span>
        </>
      )}
    </>
  );
}

/** Filter links on a card: the page's filters, a way to build an href, and the card's test ID. */
interface FilterLinks {
  filters: RestaurantFilters;
  href: (filters: RestaurantFilters) => string;
  testId: string;
}

/**
 * A Category or badge that toggles its filter on the Guide page, like the toolbar: selected
 * while that filter is on, and pressing it again turns it off. Scroll stays put.
 */
function FilterChip({
  links,
  toggle,
  label,
  icon,
  testId,
}: {
  links: FilterLinks;
  toggle: RestaurantFilterToggle;
  label: string;
  icon?: "badge-check";
  testId: string;
}) {
  const isSelected = isRestaurantFilterOn(links.filters, toggle);
  return (
    <TagLink
      tag={label}
      href={links.href(toggleRestaurantFilter(links.filters, toggle))}
      variant="filled"
      hash={false}
      icon={icon}
      isSelected={isSelected}
      aria-label={
        isSelected
          ? m.restaurantCard_filterLink_selectedAriaLabel({ filter: label })
          : m.restaurantCard_filterLink_ariaLabel({ filter: label })
      }
      routerOptions={{ preventScrollReset: true }}
      testId={testId}
    />
  );
}

function Categories({
  restaurant,
  links,
}: {
  restaurant: Restaurant;
  links?: FilterLinks;
}) {
  if (!links) {
    return (
      <span className={styles.RestaurantCard__Categories}>
        {restaurant.categories.join(", ")}
      </span>
    );
  }
  return (
    <ul
      className={styles.RestaurantCard__Chips}
      aria-label={m.restaurantCard_categories_ariaLabel()}
    >
      {restaurant.categories.map((category) => (
        <li key={category}>
          <FilterChip
            links={links}
            toggle={{ category }}
            label={category}
            testId={`${links.testId}/category`}
          />
        </li>
      ))}
    </ul>
  );
}

function Badges({
  restaurant,
  links,
  className,
}: {
  restaurant: Restaurant;
  links?: FilterLinks;
  className?: string;
}) {
  const badges = [
    {
      key: "official",
      show: restaurant.official,
      variant: "official",
      label: m.restaurantCard_badges_official_label(),
    },
    {
      key: "delivery",
      show: restaurant.delivery,
      variant: "neutral",
      label: m.restaurantCard_badges_delivery_label(),
    },
    {
      key: "pickup",
      show: restaurant.pickup,
      variant: "neutral",
      label: m.restaurantCard_badges_pickup_label(),
    },
  ] as const;
  const shown = badges.filter((badge) => badge.show);
  if (shown.length === 0) return null;
  return (
    <ul
      className={clsx(styles.RestaurantCard__Badges, className)}
      aria-label={m.restaurantCard_badges_ariaLabel()}
    >
      {shown.map((badge) => (
        <li key={badge.key}>
          {links ? (
            <FilterChip
              links={links}
              toggle={badge.key}
              label={badge.label}
              icon={badge.variant === "official" ? "badge-check" : undefined}
              testId={`${links.testId}/badge-${badge.key}`}
            />
          ) : (
            <Badge variant={badge.variant}>{badge.label}</Badge>
          )}
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
      <VisuallyHidden> {m.restaurantCard_newTab_label()}</VisuallyHidden>
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
      label: m.restaurantCard_line_label(),
      href: lineUrl(restaurant.line),
    });
  if (restaurant.instagram) {
    socials.push({
      key: "instagram",
      label: m.restaurantCard_instagram_label(),
      href: instagramUrl(restaurant.instagram),
    });
  }
  if (restaurant.facebook) {
    socials.push({
      key: "facebook",
      label: m.restaurantCard_facebook_label(),
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
  timeZone = THAILAND_TIME_ZONE,
  unavailable = item.restaurant === null,
  clamp = false,
  share,
  highlighted = false,
  filters,
  filtersHref,
  className,
  parentTestId,
}: RestaurantCardProps) {
  const testId = joinTestId(parentTestId, "restaurant-card");
  const links: FilterLinks | undefined =
    filters && filtersHref ? { filters, href: filtersHref, testId } : undefined;
  const nameId = useId();
  const writeUpId = useId();
  const [expanded, setExpanded] = useState(false);
  const restaurant = unavailable ? null : item.restaurant;
  const isDesktop = layout === "desktop";
  const socials = restaurant ? socialsOf(restaurant) : [];
  const phone = restaurant ? formatPhoneNumber(restaurant.phoneNo) : "";
  const wongnaiUrl = restaurant ? safeWebUrl(restaurant.url) : undefined;

  return (
    <article
      id={`item-${item.id}`}
      className={clsx(styles.RestaurantCard__Root, className)}
      data-layout={layout}
      data-state={restaurant ? undefined : "unavailable"}
      data-highlighted={highlighted ? "" : undefined}
      data-testid={testId}
      aria-labelledby={restaurant ? nameId : undefined}
      aria-label={
        restaurant
          ? undefined
          : m.restaurantCard_unavailable_ariaLabel({ index })
      }
    >
      {!restaurant && (
        <p className={styles.RestaurantCard__Unavailable}>
          <Icon name="alert" size={18} />
          {m.restaurantCard_unavailable_body()}
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
                  <Categories restaurant={restaurant} links={links} />
                </>
              )}
              {isDesktop && <Badges restaurant={restaurant} links={links} />}
            </div>
          </div>
          {share && (
            <ShareButton
              target={share}
              label={m.restaurantCard_share_ariaLabel({
                restaurant: restaurant.name,
              })}
              variant="ghost"
              iconOnly
              testId={`${testId}/share`}
            />
          )}
        </div>
      )}
      {restaurant && !isDesktop && (
        <Badges
          restaurant={restaurant}
          links={links}
          className={styles.RestaurantCard__Inset}
        />
      )}

      <PhotoStrip
        photos={item.photos}
        restaurantName={restaurant?.name}
        layout={layout}
        parentTestId={testId}
        lightboxParentTestId={parentTestId}
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
            {expanded
              ? m.restaurantCard_readMore_expandedLabel()
              : m.restaurantCard_readMore_label()}
          </Button>
        )}
      </div>

      {restaurant && (
        <dl className={styles.RestaurantCard__Details}>
          <WorkingHours
            workingHours={restaurant.workingHours}
            timeZone={timeZone}
            parentTestId={testId}
          />
          <div className={styles.RestaurantCard__Detail}>
            <dt className={styles.RestaurantCard__Term}>
              {m.restaurantCard_address_label()}
            </dt>
            <dd>{restaurant.address}</dd>
            <dd>
              <ExternalLink
                variant="text"
                href={mapUrl(restaurant.lat, restaurant.lng)}
                testId={`${testId}/map`}
              >
                {m.restaurantCard_map_label()}
                <Icon name="external" size={16} />
              </ExternalLink>
            </dd>
          </div>
          {isDesktop && (
            <div className={styles.RestaurantCard__Detail}>
              <dt className={styles.RestaurantCard__Term}>
                {m.restaurantCard_contact_label()}
              </dt>
              <dd className={styles.RestaurantCard__Contacts}>
                <ButtonLink
                  variant="ghost"
                  size="compact"
                  href={telHref(restaurant.phoneNo)}
                  testId={`${testId}/call`}
                >
                  <Icon name="phone" size={16} />
                  <VisuallyHidden>
                    {m.restaurantCard_call_hiddenLabel()}{" "}
                  </VisuallyHidden>
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
                {wongnaiUrl && (
                  <ExternalLink
                    variant="ghost"
                    size="compact"
                    href={wongnaiUrl}
                    testId={`${testId}/wongnai`}
                  >
                    {m.restaurantCard_wongnai_label()}
                    <Icon name="external" size={14} />
                  </ExternalLink>
                )}
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
            {m.restaurantCard_call_label({ phone })}
          </ButtonLink>
          {wongnaiUrl && (
            <ExternalLink
              variant="secondary"
              href={wongnaiUrl}
              testId={`${testId}/wongnai`}
            >
              {m.restaurantCard_wongnai_shortLabel()}
              <Icon name="external" size={14} />
            </ExternalLink>
          )}
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
