import { NotFound } from "@/components/common/NotFound";
import { TestIdScope } from "@/lib/testIds";

/** Any URL no other route matches. Test IDs here start with `unknown/`. */
export default function NotFoundRoute() {
  return (
    <TestIdScope name="unknown">
      <NotFound />
    </TestIdScope>
  );
}
