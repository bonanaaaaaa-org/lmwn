import { NotFound } from "@/components/common/NotFound";

const PAGE_TEST_ID = "unknown";

/** Any URL no other route matches. */
export default function NotFoundRoute() {
  return (
    <div data-testid={PAGE_TEST_ID}>
      <NotFound parentTestId={PAGE_TEST_ID} />
    </div>
  );
}
