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
      screen.getByRole("link", { name: "กลับไปหน้าไกด์ทั้งหมด" }),
    ).toHaveAttribute("href", "/");
  });

  it("puts its test ID under the parent and passes it to the back link", () => {
    render(<NotFound parentTestId="unknown" />);

    expect(screen.getByTestId("unknown/not-found")).toContainElement(
      screen.getByRole("heading", { level: 1 }),
    );
    expect(screen.getByTestId("unknown/not-found/back-link")).toHaveAttribute(
      "href",
      "/",
    );
  });
});
