import { fetchJson } from "@/lib/apiClient";

import { guideSchema } from "./types";

export const guidesApi = {
  /** One Guide with every Guide Item and its Restaurant, in guide order. */
  get: (guideId: string, signal?: AbortSignal) =>
    fetchJson(`/guides/${encodeURIComponent(guideId)}`, guideSchema, {
      signal,
    }),
};
