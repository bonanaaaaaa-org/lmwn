import { render, screen } from "@testing-library/react";

import { OpenStatus } from "./OpenStatus";

describe("OpenStatus", () => {
  it("says open in words, not only colour", () => {
    render(<OpenStatus open testId="status" />);
    const status = screen.getByTestId("status");
    expect(status).toHaveTextContent("เปิดอยู่");
    expect(status).toHaveAttribute("data-state", "open");
  });

  it("says when a closed Restaurant opens later today", () => {
    render(<OpenStatus open={false} opensAt="10:00" testId="status" />);
    const status = screen.getByTestId("status");
    expect(status).toHaveTextContent("ปิดอยู่ · เปิด 10:00");
    expect(status).toHaveAttribute("data-state", "closed");
  });

  it("says closed today when it doesn't open again today", () => {
    render(<OpenStatus open={false} testId="status" />);
    expect(screen.getByTestId("status")).toHaveTextContent("ปิดวันนี้");
  });

  it("ignores opensAt while open", () => {
    render(<OpenStatus open opensAt="10:00" testId="status" />);
    expect(screen.getByTestId("status").textContent).toBe("เปิดอยู่");
  });
});
