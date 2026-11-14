import { normaliseSearchText, type GuideIndexFilters } from "./filters";

/** One cache entry per filter set, so a late response can only fill its own entry. */
export const guideIndexKeys = {
  all: ["guides"] as const,
  lists: () => [...guideIndexKeys.all, "list"] as const,
  list: ({ q, tags }: GuideIndexFilters) =>
    [
      ...guideIndexKeys.lists(),
      { q: normaliseSearchText(q), tags: [...new Set(tags)] },
    ] as const,
};
