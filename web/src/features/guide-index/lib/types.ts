import { z } from "zod";

import { photoSchema } from "@/features/guides/lib/types";

/** One Guide as the Guide Index shows it (`GET /guides` item). */
export const guideSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  coverPhoto: photoSchema,
  tags: z.array(z.string()),
  itemCount: z.number().int().nonnegative(),
});
export type GuideSummary = z.infer<typeof guideSummarySchema>;

/** `GET /guides`: the matching Guides in upstream order; `total` is `items.length`. */
export const guideListSchema = z.object({
  items: z.array(guideSummarySchema),
  total: z.number().int().nonnegative(),
});
export type GuideList = z.infer<typeof guideListSchema>;
