import { useContext, useEffect } from "react";
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

import { showToast } from "@/components/common/Toast";
import { AppShell, guidePageTestIdFrom } from "@/components/layout/AppShell";
import { env } from "@/lib/env";
import { addManifestLink } from "@/lib/manifestLink";
import { whenPageSettled } from "@/lib/whenPageSettled";
import { appLocale } from "@/lib/locale";
import {
  preloadPageScript,
  type PreloadPageAssets,
} from "@/lib/preloadPageData";
import { Providers } from "@/lib/Providers";
import { useRouterHref } from "@/lib/routerHref";
import { themeScript } from "@/lib/theme";
import { CSS_LAYER_ORDER } from "@/styles/layers";
import { m } from "@/paraglide/messages.js";

// Lets React Aria links pass React Router options (e.g. `replace`) via `routerOptions`.
declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/**
 * The installable PWA, in production builds, once the page has settled (whenPageSettled): links
 * the web app manifest (see addManifestLink for why it isn't in the head) and registers the
 * service worker, so neither competes with the first paint. A new deploy's worker waits until the
 * diner taps the update toast.
 */
function usePwa() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let cancelled = false;
    void whenPageSettled().then(async () => {
      if (cancelled) return;
      addManifestLink();
      if (!("serviceWorker" in navigator)) return;
      const { registerServiceWorker } = await import("@/lib/serviceWorker");
      registerServiceWorker({
        onUpdateReady: (update) =>
          showToast({
            message: m.app_updateToast_body(),
            action: { label: m.app_updateToast_label(), onAction: update },
          }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
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
    // The head script sets `data-theme` on <html> before React hydrates (see `@/lib/theme`).
    <html lang={appLocale} suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        {/* Before any stylesheet: fixes the cascade layer order (see CSS_LAYER_ORDER). */}
        <style>{CSS_LAYER_ORDER}</style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{m.app_title()}</title>
        <meta name="description" content={m.app_description()} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/*
          Installable PWA (#43). The manifest link is added after load (usePwa); the
          `theme-color` metas come from the head script below (dark mode, #47).
        */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="apple-mobile-web-app-title"
          content={m.app_manifest_shortTitle()}
        />
        {/* Every page's data comes from the gateway (CORS), and when deployed its photos do too (no CORS). */}
        <link rel="preconnect" href={env.apiBaseUrl} crossOrigin="anonymous" />
        <link rel="preconnect" href={env.apiBaseUrl} />
        <script
          // Applies a saved theme before first paint (no flash of the other theme) and adds the
          // `theme-color` metas (see `applyTheme` for why React doesn't render them), then starts
          // the page's gateway request and route code while the entry JavaScript downloads.
          // Built from function source, which differs between the build-time render and the
          // client bundle; React never re-runs or patches an inline script.
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              themeScript() + preloadPageScript(env.apiBaseUrl, preloadAssets),
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
  usePwa();
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
