import { z } from "zod";

/**
 * Zod schemas for the gateway's `GET /guides/{guideId}` contract (see
 * api-gateway/app/adapters/inbound/http/schemas.py). TypeScript types are inferred from them.
 */

/** Thailand time: the gateway's `timeZone` for Working Hours and Open Now. */
export const THAILAND_TIME_ZONE = "Asia/Bangkok";

export const photoSchema = z.object({
  id: z.string(),
  smallUrl: z.string(),
  largeUrl: z.string(),
});
export type Photo = z.infer<typeof photoSchema>;

/** Minutes since midnight of the opening day; `closesAt` may run past 1440 (overnight). */
export const openingRangeSchema = z.object({
  opensAt: z.number().int().min(0).max(1439),
  closesAt: z.number().int().min(1).max(2880),
});

/** One ISO weekday (1 = Monday … 7 = Sunday); no ranges means closed. */
export const workingDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  ranges: z.array(openingRangeSchema),
});
export type WorkingDay = z.infer<typeof workingDaySchema>;

export const restaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  branch: z.string().optional(),
  /** 0 together with `numberOfReviews` 0 means an Unrated Restaurant. */
  rating: z.number().min(0).max(5),
  numberOfReviews: z.number().int().min(0),
  /** The Restaurant's page on Wongnai. */
  url: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  phoneNo: z.string(),
  categories: z.array(z.string()),
  workingHours: z.array(workingDaySchema),
  official: z.boolean(),
  delivery: z.boolean(),
  pickup: z.boolean(),
  line: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});
export type Restaurant = z.infer<typeof restaurantSchema>;

export const guideItemSchema = z.object({
  id: z.string(),
  /** The editor's write-up of the Restaurant. */
  description: z.string(),
  photos: z.array(photoSchema),
  /** `null` for an Unavailable Restaurant: its details couldn't be loaded. */
  restaurant: restaurantSchema.nullable(),
});
export type GuideItem = z.infer<typeof guideItemSchema>;

export const guideSchema = z.object({
  id: z.string(),
  title: z.string(),
  socialTitle: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  coverPhoto: photoSchema,
  tags: z.array(z.string()),
  /** ISO 8601 date-time. */
  writeDate: z.iso.datetime({ offset: true }),
  timeZone: z.literal(THAILAND_TIME_ZONE),
  /** Guide Items in the editor's order. */
  items: z.array(guideItemSchema),
});
export type Guide = z.infer<typeof guideSchema>;
