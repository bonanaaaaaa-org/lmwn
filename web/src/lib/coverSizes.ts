/**
 * The `sizes` of the two covers that are a page's LCP image. Shared by the components and the
 * head script that preloads the cover (`preloadPageScript`), so both pick the same candidate.
 */

/**
 * How wide a cover renders in the Guide Index grid: one column on phones, two on tablets,
 * three (capped by the 75rem layout) from 64rem.
 */
export const GUIDE_CARD_SIZES =
  "(min-width: 64rem) 23rem, (min-width: 48rem) 50vw, 100vw";

/** The Guide page's cover: full width, capped by the 75rem layout. */
export const GUIDE_COVER_SIZES = "(min-width: 75rem) 70rem, 100vw";
