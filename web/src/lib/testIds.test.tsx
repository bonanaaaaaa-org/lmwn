import { render, screen } from "@testing-library/react";

import { TestIdScope, testId, useTestId } from "@/lib/testIds";

function Retry() {
  const testIdFor = useTestId();
  return <button data-testid={testIdFor("retry")}>ลองใหม่</button>;
}

describe("test IDs", () => {
  it("joins kebab-case segments with slashes", () => {
    expect(testId("guide", "restaurant-card", "share")).toBe(
      "guide/restaurant-card/share",
    );
  });

  it("rejects segments that are not kebab-case", () => {
    expect(() => testId("guide", "restaurantCard")).toThrow(/kebab-case/);
    expect(() => testId("guide", "a/b")).toThrow(/kebab-case/);
  });

  it("builds {page}/{component}*/{element} from nested scopes", () => {
    render(
      <TestIdScope name="guide">
        <TestIdScope name="restaurant-card">
          <TestIdScope name="error-panel">
            <Retry />
          </TestIdScope>
        </TestIdScope>
      </TestIdScope>,
    );

    expect(
      screen.getByTestId("guide/restaurant-card/error-panel/retry"),
    ).toBeInTheDocument();
  });

  it("lets a component add its own segment without a wrapper", () => {
    function Panel() {
      const testIdFor = useTestId("error-panel");
      return <button data-testid={testIdFor("retry")}>ลองใหม่</button>;
    }
    render(
      <TestIdScope name="guide-index">
        <Panel />
      </TestIdScope>,
    );

    expect(
      screen.getByTestId("guide-index/error-panel/retry"),
    ).toBeInTheDocument();
  });
});
