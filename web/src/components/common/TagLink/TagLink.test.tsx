import { render, screen } from "@testing-library/react";

import { sampleTags } from "@/test-utils/fixtures/sampleContent";

import { TagLink, tagHref } from "./TagLink";

describe("tagHref", () => {
  it("points at the Guide Index filtered by the encoded Tag", () => {
    expect(tagHref("One Bangkok")).toBe("/?tag=One+Bangkok");
    expect(
      new URLSearchParams(tagHref(sampleTags.cafe).slice(2)).get("tag"),
    ).toBe(sampleTags.cafe);
  });

  it("keeps characters that would otherwise break the query intact", () => {
    expect(new URLSearchParams(tagHref("a&b=c").slice(2)).get("tag")).toBe(
      "a&b=c",
    );
  });
});

describe("TagLink", () => {
  it("renders a link named by the Tag", () => {
    render(<TagLink tag={sampleTags.cafe} />);

    expect(screen.getByRole("link", { name: sampleTags.cafe })).toHaveAttribute(
      "href",
      tagHref(sampleTags.cafe),
    );
  });

  it("uses a caller-built href when given one", () => {
    render(
      <TagLink
        tag={sampleTags.cafe}
        href={`/?q=coffee&tag=${sampleTags.cafe}`}
      />,
    );

    expect(screen.getByRole("link", { name: sampleTags.cafe })).toHaveAttribute(
      "href",
      `/?q=coffee&tag=${sampleTags.cafe}`,
    );
  });

  it("takes its finished test ID from the parent", () => {
    render(
      <TagLink tag={sampleTags.cafe} testId="guide-index/guide-card/tag" />,
    );

    expect(screen.getByTestId("guide-index/guide-card/tag")).toBe(
      screen.getByRole("link", { name: sampleTags.cafe }),
    );
  });

  it("is a plain chip with a caller-given name, and marks a selected one current", () => {
    const { rerender } = render(
      <TagLink tag="Cafe" href="/?a=1" hash={false} aria-label="Only Cafe" />,
    );

    const link = screen.getByRole("link", { name: "Only Cafe" });
    expect(link.textContent).toBe("Cafe");
    expect(link).not.toHaveAttribute("aria-current");

    rerender(
      <TagLink
        tag="Cafe"
        href="/"
        hash={false}
        icon="check"
        isSelected
        aria-label="Not only Cafe"
      />,
    );
    expect(screen.getByRole("link", { name: "Not only Cafe" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});
