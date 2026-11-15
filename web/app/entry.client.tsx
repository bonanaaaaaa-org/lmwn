import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { ensureTemporal } from "@/lib/temporal";

// React Router's default client entry, after Temporal is ready: the app reads the clock with it
// while rendering (Open Now).
await ensureTemporal();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
