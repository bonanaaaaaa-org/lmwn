import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import "modern-normalize/modern-normalize.css";
import "@/styles/globals.css";

import { Providers } from "@/lib/Providers";

import styles from "./root.module.css";

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
  return (
    <Providers>
      <main className={styles.Main}>
        <Outlet />
      </main>
    </Providers>
  );
}
