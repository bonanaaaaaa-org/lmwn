import { QueryClient } from "@tanstack/react-query";

/**
 * A fresh client per test: no retries, no cache shared between tests. Render components with
 * `renderWithProviders` (`@/test-utils/renderWithProviders`), which creates one for you.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}
