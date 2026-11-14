import { useParams } from "react-router";

import type { AppShellRouteHandle } from "@/components/layout/AppShell";
import {
  GUIDE_PAGE_TEST_ID,
  GuidePage,
} from "@/features/guides/pages/GuidePage";

// On a phone the shell's header shows the Guide layout, with a back link to the Guide Index.
export const handle = {
  guidePageTestId: GUIDE_PAGE_TEST_ID,
} satisfies AppShellRouteHandle;

/** A Guide: `/guides/:guideId`. */
export default function GuideRoute() {
  const { guideId } = useParams();
  if (!guideId) return null;
  // A new Guide starts fresh (scroll, expanded write-ups).
  return <GuidePage key={guideId} guideId={guideId} />;
}
