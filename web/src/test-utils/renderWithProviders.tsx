import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { LocaleProvider } from "@/lib/Providers";
import { createTestQueryClient } from "@/test-utils/queryClient";

/**
 * Renders `ui` inside the app's providers as tests need them: a fresh TanStack Query client
 * (no retries) and React Aria's `I18nProvider` with the app locale (`th-TH`), so locale-aware
 * React Aria components (dates, numbers, collators) behave as in the app.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(ui, {
      ...options,
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <LocaleProvider>{children}</LocaleProvider>
        </QueryClientProvider>
      ),
    }),
  };
}
