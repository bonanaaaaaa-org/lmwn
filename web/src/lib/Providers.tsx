import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { I18nProvider } from "react-aria-components";

import { intlLocale } from "@/lib/locale";
import { createQueryClient } from "@/lib/queryClient";

// Dev-only: the devtools chunk is never loaded in production builds.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null;

/**
 * React Aria's `I18nProvider` set to the app locale (`th-TH`, from `@/lib/locale`), so its
 * components format dates, numbers and collation as Thai. Messages (`m.*()`) need no provider.
 * Shared by `Providers`, `renderWithProviders` and the Storybook decorators.
 */
export function LocaleProvider({ children }: { children?: React.ReactNode }) {
  return <I18nProvider locale={intlLocale}>{children}</I18nProvider>;
}

/** App-wide providers: TanStack Query and React Aria's locale. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{children}</LocaleProvider>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
