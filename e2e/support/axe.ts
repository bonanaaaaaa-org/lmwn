import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

type Violation = Awaited<
  ReturnType<AxeBuilder["analyze"]>
>["violations"][number];

/** The WCAG 2.2 A and AA rule set the spec requires (axe tags are cumulative per version). */
export const WCAG_22_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

/**
 * Runs an axe scan of the page as it is now and fails on any violation, of any impact.
 * Call it once the state under test has rendered (await a visible locator first).
 * The full results are attached to the test report as `axe-results.json`.
 */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_22_AA_TAGS)
    .analyze();

  await test.info().attach("axe-results.json", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  // Compact summaries keep the failure readable; the full nodes are in the attachment.
  expect(
    results.violations.map(summarize),
    "axe violations (WCAG 2.2 A and AA)",
  ).toEqual([]);
}

function summarize(violation: Violation): string {
  const targets = violation.nodes
    .map((node) => node.target.join(" "))
    .join(", ");
  return `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} (${targets}) ${violation.helpUrl}`;
}
