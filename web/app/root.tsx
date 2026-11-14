import { RouterProvider } from "react-aria-components";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
  useNavigate,
  type NavigateOptions,
} from "react-router";

import "@/styles/globals.css";

import { AppShell, guidePageTestIdFrom } from "@/components/layout/AppShell";
import { Providers } from "@/lib/Providers";
import { useRouterHref } from "@/lib/routerHref";

// Lets React Aria links pass React Router options (e.g. `replace`) via `routerOptions`.
declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Guide to Hidden Gems</title>
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
