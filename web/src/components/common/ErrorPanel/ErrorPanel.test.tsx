import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { m } from "@/paraglide/messages.js";

import { ErrorPanel } from "./ErrorPanel";

describe("ErrorPanel", () => {
  it("is announced as an alert with its title", () => {
    render(<ErrorPanel title={m.guide_errorPanel_title()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      m.guide_errorPanel_title(),
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: m.guide_errorPanel_title(),
      }),
    ).toBeInTheDocument();
  });

  it("says loading failed by default", () => {
    render(<ErrorPanel />);

    expect(
      screen.getByRole("heading", { level: 2, name: m.errorPanel_title() }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(m.errorPanel_body());
  });

  it("calls onRetry when the diner presses retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorPanel onRetry={onRetry} />);

    await user.click(
      screen.getByRole("button", { name: m.errorPanel_retry_label() }),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("ignores repeat presses while a retry is in flight", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorPanel onRetry={onRetry} isRetrying />);

    await user.click(
      screen.getByRole("button", { name: m.errorPanel_retry_pendingLabel() }),
    );

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("has no retry button when there is nothing to retry", () => {
    render(<ErrorPanel />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("puts its test ID under the parent and passes it to the retry button", () => {
    const { rerender } = render(
      <ErrorPanel parentTestId="guide" onRetry={() => {}} />,
    );
    expect(screen.getByTestId("guide/error-panel")).toBe(
      screen.getByRole("alert"),
    );
    expect(screen.getByTestId("guide/error-panel/retry")).toBe(
      screen.getByRole("button", { name: m.errorPanel_retry_label() }),
    );

    rerender(
      <ErrorPanel
        parentTestId="guide-index"
        variant="inline"
        onRetry={() => {}}
      />,
    );
    expect(
      screen.getByTestId("guide-index/error-panel/retry"),
    ).toBeInTheDocument();
  });

  it("uses its own segment alone when there is no parent", () => {
    render(<ErrorPanel onRetry={() => {}} />);

    expect(screen.getByTestId("error-panel/retry")).toBeInTheDocument();
  });
});
