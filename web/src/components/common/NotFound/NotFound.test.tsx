import { render, screen } from "@testing-library/react";

import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("names what is missing as the page heading", () => {
    render(<NotFound title="ไม่พบไกด์นี้" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "ไม่พบไกด์นี้" }),
    ).toBeInTheDocument();
  });

  it("links back to the Guide Index", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: "กลับไปหน้ารวมไกด์" }),
    ).toHaveAttribute("href", "/");
  });
});
