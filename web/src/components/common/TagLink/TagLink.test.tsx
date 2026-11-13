import { render, screen } from "@testing-library/react";

import { TagLink, tagHref } from "./TagLink";

describe("tagHref", () => {
  it("points at the Guide Index filtered by the encoded Tag", () => {
    expect(tagHref("One Bangkok")).toBe("/?tag=One+Bangkok");
    expect(new URLSearchParams(tagHref("คาเฟ่").slice(2)).get("tag")).toBe(
      "คาเฟ่",
    );
  });

  it("keeps characters that would otherwise break the query intact", () => {
    expect(new URLSearchParams(tagHref("a&b=c").slice(2)).get("tag")).toBe(
      "a&b=c",
    );
  });
});

describe("TagLink", () => {
  it("renders a link named by the Tag", () => {
    render(<TagLink tag="คาเฟ่" />);

    expect(screen.getByRole("link", { name: "คาเฟ่" })).toHaveAttribute(
      "href",
      tagHref("คาเฟ่"),
    );
  });
});
