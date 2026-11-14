import { useHref } from "react-router";

// A URL with a scheme (https:, tel:, mailto:) or protocol-relative (//host) leaves the app.
const EXTERNAL_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/** Whether `href` points outside the app, so the router must leave it alone. */
export function isExternalHref(href: string): boolean {
  return EXTERNAL_HREF.test(href);
}

/**
 * `useHref` for React Aria's `RouterProvider`: resolves app paths through React Router, but
 * returns external URLs unchanged. React Router would otherwise treat `tel:0939164541` as a
 * relative path and join it onto the current route.
 */
export function useRouterHref(href: string): string {
  const resolved = useHref(href);
  return isExternalHref(href) ? href : resolved;
}
