import { setupServer } from "msw/node";

/** Shared msw server; tests add handlers with `server.use(...)`. Lifecycle lives in vitest.setup.tsx. */
export const server = setupServer();
