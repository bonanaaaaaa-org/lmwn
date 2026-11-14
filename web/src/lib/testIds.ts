/**
 * `data-testid` values are paths: each component owns an ID and passes it down to its children.
 *
 * - A page puts its name on its root (`data-testid="guide"`) and passes it to its components
 *   as `parentTestId`. The shell around every page uses `app`.
 * - A component joins `parentTestId` with its own segment, puts the result on its root element
 *   and passes it on as its children's `parentTestId`: `guide` → `guide/restaurant-card` →
 *   `guide/restaurant-card/photo-strip`. Depth is unlimited.
 * - An interactive element inside a component appends its own name: `guide/restaurant-card/share`.
 * - Atoms (Button, ButtonLink, TagLink) take the finished string as `testId` and add nothing.
 *
 * Segments are kebab-case. Repeated components share an ID; pick one by order or text. State
 * never goes in an ID: assert it through ARIA (`aria-pressed`, `aria-expanded`) or `data-state`.
 */
const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Joins a parent's test ID with one kebab-case segment; without a parent, the segment alone. */
export function joinTestId(
  parentTestId: string | undefined,
  segment: string,
): string {
  if (!SEGMENT.test(segment)) {
    throw new Error(`Test ID segment "${segment}" must be kebab-case`);
  }
  return parentTestId ? `${parentTestId}/${segment}` : segment;
}
