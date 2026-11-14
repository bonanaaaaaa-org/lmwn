import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/apiClient";
import { isOffline } from "@/lib/network";

const MAX_RETRIES = 2;

/**
 * Client errors (4xx) won't succeed on retry; network failures and 5xx might. Offline, nothing
 * will: the service worker already answered from its cache if it could, so the failure shows
 * at once (with offline copy) instead of after the retries.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  if (isOffline()) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Guides change rarely; avoid refetching on every mount.
        staleTime: 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        // Run queries offline too, instead of pausing them: the service worker may answer from
        // its cache (a Guide opened before), and otherwise the error panel says the diner is
        // offline rather than a skeleton waiting forever. Back online, queries refetch as usual.
        networkMode: "always",
      },
    },
  });
}
