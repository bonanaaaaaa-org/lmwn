import { render, screen } from "@testing-library/react";

import { TestIdScope } from "@/lib/testIds";

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

  it("scopes the back link's test ID under the page", () => {
    render(
      <TestIdScope name="unknown">
        <NotFound />
      </TestIdScope>,
    );

    expect(screen.getByTestId("unknown/not-found/back-link")).toHaveAttribute(
      "href",
      "/",
    );
  });
});
