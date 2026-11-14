import type { ShareTarget } from "@/hooks/useShare";
import { m } from "@/paraglide/messages.js";

import type { Guide, GuideItem, Restaurant } from "./types";

/** The anchor on a Guide Item's card, and the hash of its share link: `item-{guideItemId}`. */
export const itemAnchorId = (guideItemId: string) => `item-${guideItemId}`;

const ITEM_HASH = /^#item-(.+)$/;

/** The Guide Item ID in a `#item-{guideItemId}` hash, if it is one. */
export function guideItemIdFromHash(hash: string): string | undefined {
  const match = ITEM_HASH.exec(hash);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

/** `/guides/{guideId}`: the link shared for a Guide, without its search or filter state. */
export const guidePath = (guideId: string) =>
  `/guides/${encodeURIComponent(guideId)}`;

/** The Restaurant's name, with `m.restaurantCard_branch_body()` after it when it has a branch. */
export const restaurantDisplayName = (restaurant: Restaurant) =>
  restaurant.branch
    ? `${restaurant.name} ${m.restaurantCard_branch_body({ branch: restaurant.branch })}`
    : restaurant.name;

/** Sharing a whole Guide: the share text is its socialTitle. */
export function guideShareTarget(
  guide: Pick<Guide, "id" | "title" | "socialTitle">,
): ShareTarget {
  return {
    title: guide.title,
    text: guide.socialTitle,
    url: guidePath(guide.id),
    copiedMessage: m.guideHeader_share_copiedBody(),
  };
}

/**
 * Sharing one card: the text names the Restaurant and the Guide, and the link opens the Guide
 * at that card. An Unavailable Restaurant has no name to share, so no share target.
 */
export function guideItemShareTarget(
  guide: Pick<Guide, "id" | "title">,
  item: Pick<GuideItem, "id" | "restaurant">,
): ShareTarget | undefined {
  if (!item.restaurant) return undefined;
  const name = restaurantDisplayName(item.restaurant);
  return {
    title: name,
    text: m.restaurantCard_share_text({ restaurant: name, guide: guide.title }),
    url: `${guidePath(guide.id)}#${itemAnchorId(encodeURIComponent(item.id))}`,
    copiedMessage: m.restaurantCard_share_copiedBody({
      restaurant: item.restaurant.name,
    }),
  };
}
