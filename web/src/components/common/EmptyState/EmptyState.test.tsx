import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { sampleEmptyState } from "@/test-utils/fixtures/sampleContent";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("explains the empty result under a heading", () => {
    render(
      <EmptyState
        title={sampleEmptyState.filterTitle}
        description={sampleEmptyState.shortDescription}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: sampleEmptyState.filterTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(sampleEmptyState.shortDescription),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a button action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        title={sampleEmptyState.shortTitle}
        actionLabel={sampleEmptyState.clearFilters}
        onAction={onAction}
        parentTestId="guide"
      />,
    );
    await user.click(screen.getByTestId("guide/empty-state/action"));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("guide/empty-state")).toBeInTheDocument();
  });

  it("offers a link action", () => {
    render(
      <EmptyState
        title={sampleEmptyState.shortTitle}
        actionLabel={sampleEmptyState.clearSearch}
        actionHref="/"
      />,
    );
    expect(
      screen.getByRole("link", { name: sampleEmptyState.clearSearch }),
    ).toHaveAttribute("href", "/");
  });
});
