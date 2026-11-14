import { fetchJson } from "@/lib/apiClient";

import { toSearchParams, type GuideIndexFilters } from "./filters";
import { guideListSchema } from "./types";

export const guideIndexApi = {
  /** `GET /guides?q=…&tag=…&tag=…`: Guides matching the text and every Tag. */
  list: (filters: GuideIndexFilters, signal?: AbortSignal) => {
    const search = toSearchParams(filters).toString();
    return fetchJson(
      search ? `/guides?${search}` : "/guides",
      guideListSchema,
      { signal },
    );
  },
};
