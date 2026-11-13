import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// Every file under app/routes/ becomes a route; keep colocated tests out.
export default flatRoutes({
  ignoredRouteFiles: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
}) satisfies RouteConfig;
