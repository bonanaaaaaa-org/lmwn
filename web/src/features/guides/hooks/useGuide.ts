import { useQuery } from "@tanstack/react-query";

import { guidesApi } from "@/features/guides/lib/guidesApi";
import { guideKeys } from "@/features/guides/lib/queryKeys";
import type { Guide } from "@/features/guides/lib/types";

/** One hydrated Guide. Retries follow the app defaults: up to 2, never for a 404. */
export const useGuide = (guideId: string) =>
  useQuery<Guide, Error>({
    queryKey: guideKeys.detail(guideId),
    queryFn: ({ signal }) => guidesApi.get(guideId, signal),
  });
