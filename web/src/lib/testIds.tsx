import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * `data-testid` values follow `{page}/{component}*\/{element}`:
 *
 * - `page`: the screen, set once by its route: `app` (the shell around every page), `guide-index`,
 *   `guide`, `unknown` (the catch-all 404 route).
 * - `component`: zero or more nested components, each adding its own segment
 *   (`guide/restaurant-card/photo-strip`).
 * - `element`: the smallest thing a person interacts with: a button, link, input, select or
 *   toggle. Containers, text and images get no test ID; reach them by role or landmark.
 *
 * Every segment is kebab-case. Repeated elements (one per card or chip) share an ID; tell them
 * apart by order or text. State never goes in an ID: assert it through ARIA (`aria-pressed`,
 * `aria-expanded`) or `data-state`.
 */
const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Joins segments into a test ID, rejecting anything that is not kebab-case. */
export function testId(...segments: readonly string[]): string {
  for (const segment of segments) {
    if (!SEGMENT.test(segment)) {
      throw new Error(`Test ID segment "${segment}" must be kebab-case`);
    }
  }
  return segments.join("/");
}

const TestIdScopeContext = createContext<readonly string[]>([]);

export interface TestIdScopeProps {
  /** A page name at the route, or a component name inside a component. */
  name: string;
  children: ReactNode;
}

/** Adds one segment (a page or a component) to every test ID rendered inside it. */
export function TestIdScope({ name, children }: TestIdScopeProps) {
  const parent = useContext(TestIdScopeContext);
  const scope = useMemo(() => [...parent, name], [parent, name]);
  return <TestIdScopeContext value={scope}>{children}</TestIdScopeContext>;
}

/**
 * Returns a function that builds the test ID for an element in the current scope, plus any
 * component segments passed here. Inside the `guide` page, `useTestId("error-panel")("retry")`
 * is `"guide/error-panel/retry"`.
 */
export function useTestId(
  ...components: readonly string[]
): (element: string) => string {
  const scope = useContext(TestIdScopeContext);
  return (element) => testId(...scope, ...components, element);
}
