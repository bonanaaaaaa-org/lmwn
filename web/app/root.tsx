import { RouterProvider } from "react-aria-components";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useHref,
  useNavigate,
} from "react-router";

import "@/styles/globals.css";

import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/lib/Providers";

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
  return (
    // React Aria links (Link, ButtonLink, TagLink) navigate client-side through React Router.
    <RouterProvider navigate={(to) => void navigate(to)} useHref={useHref}>
      <Providers>
        <AppShell>
          <Outlet />
        </AppShell>
      </Providers>
    </RouterProvider>
  );
}
