import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/apiClient";

const MAX_RETRIES = 2;

/** Client errors (4xx) won't succeed on retry; network failures and 5xx might. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
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
      },
    },
  });
}
