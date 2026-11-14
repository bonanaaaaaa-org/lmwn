import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { OpenStatus } from "./OpenStatus";

describe("OpenStatus", () => {
  it("says open in words, not only colour", () => {
    render(<OpenStatus open testId="status" />);
    const status = screen.getByTestId("status");
    expect(status).toHaveTextContent(m.openStatus_open_label());
    expect(status).toHaveAttribute("data-state", "open");
  });

  it("says when a closed Restaurant opens later today", () => {
    render(<OpenStatus open={false} opensAt="10:00" testId="status" />);
    const status = screen.getByTestId("status");
    expect(status).toHaveTextContent(
      m.openStatus_closed_opensAtLabel({ time: "10:00" }),
    );
    expect(status).toHaveAttribute("data-state", "closed");
  });

  it("says closed today when it doesn't open again today", () => {
    render(<OpenStatus open={false} testId="status" />);
    expect(screen.getByTestId("status")).toHaveTextContent(
      m.openStatus_closed_todayLabel(),
    );
  });

  it("ignores opensAt while open", () => {
    render(<OpenStatus open opensAt="10:00" testId="status" />);
    expect(screen.getByTestId("status").textContent).toBe(
      m.openStatus_open_label(),
    );
  });
});
