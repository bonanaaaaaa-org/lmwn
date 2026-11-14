import { useContext } from "react";
import { RouterProvider } from "react-aria-components";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
  useNavigate,
  UNSAFE_FrameworkContext,
  type NavigateOptions,
} from "react-router";

import "@/styles/globals.css";

import { AppShell, guidePageTestIdFrom } from "@/components/layout/AppShell";
import { env } from "@/lib/env";
import { appLocale } from "@/lib/locale";
import {
  preloadPageScript,
  type PreloadPageAssets,
} from "@/lib/preloadPageData";
import { Providers } from "@/lib/Providers";
import { useRouterHref } from "@/lib/routerHref";
import { CSS_LAYER_ORDER } from "@/styles/layers";
import { m } from "@/paraglide/messages.js";

// Lets React Aria links pass React Router options (e.g. `replace`) via `routerOptions`.
declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/** Route IDs (from app/routes/) of the pages the head script preloads. */
const PRELOAD_ROUTES = {
  guideIndex: "routes/_index",
  guide: "routes/guides.$guideId",
} as const;

/**
 * Each preloaded page's route code, read from React Router's build manifest while the SPA's
 * index.html is rendered at build time. Empty in dev, where modules aren't bundled.
 */
function usePreloadPageAssets(): PreloadPageAssets {
  const routes = useContext(UNSAFE_FrameworkContext)?.manifest.routes;
  if (import.meta.env.DEV || !routes) return {};
  const assets: PreloadPageAssets = {};
  for (const [page, routeId] of Object.entries(PRELOAD_ROUTES)) {
    const route = routes[routeId];
    if (!route?.module) continue;
    assets[page as keyof typeof PRELOAD_ROUTES] = [
      route.module,
      ...(route.imports ?? []),
      ...(route.css ?? []),
    ];
  }
  return assets;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const preloadAssets = usePreloadPageAssets();
  return (
    <html lang={appLocale}>
      <head>
        <meta charSet="UTF-8" />
        {/* Before any stylesheet: fixes the cascade layer order (see CSS_LAYER_ORDER). */}
        <style>{CSS_LAYER_ORDER}</style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{m.app_title()}</title>
        <meta name="description" content={m.app_description()} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Every page's data comes from the gateway (CORS), and when deployed its photos do too (no CORS). */}
        <link rel="preconnect" href={env.apiBaseUrl} crossOrigin="anonymous" />
        <link rel="preconnect" href={env.apiBaseUrl} />
        <script
          // Starts the page's gateway request and route code while the entry JavaScript
          // downloads. Built from function source, which differs between the build-time
          // render and the client bundle; React never re-runs or patches an inline script.
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: preloadPageScript(env.apiBaseUrl, preloadAssets),
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const navigate = useNavigate();
  const guidePageTestId = guidePageTestIdFrom(useMatches());
  return (
    // React Aria links (Link, ButtonLink, TagLink) navigate client-side through React Router.
    <RouterProvider
      navigate={(to, options) => void navigate(to, options)}
      useHref={useRouterHref}
    >
      <Providers>
        <AppShell guidePageTestId={guidePageTestId}>
          <Outlet />
        </AppShell>
      </Providers>
    </RouterProvider>
  );
}
