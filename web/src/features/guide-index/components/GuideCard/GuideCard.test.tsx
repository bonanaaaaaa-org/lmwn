import { render, screen, within } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";
import {
  cafeGuide,
  guideIndexTags as t,
} from "@/test-utils/fixtures/guideIndex";

import { GuideCard, type GuideCardGuide } from "./GuideCard";

const guide: GuideCardGuide = {
  title: cafeGuide.title,
  count: cafeGuide.itemCount,
  description: cafeGuide.shortDescription,
  cover: [
    { url: "http://img/r/854/480/a.jpg", width: 854 },
    { url: "http://img/r/1920/1080/a.jpg", width: 1920 },
  ],
  tags: [t.coffee, "One Bangkok"],
  href: "/guides/g1",
};

describe("GuideCard", () => {
  it("shows the count, title, description and Tags of the Guide", () => {
    render(<GuideCard guide={guide} parentTestId="guide-index" />);

    const card = screen.getByRole("article");
    expect(
      within(card).getByText(
        m.guideCard_restaurantCount_body({ count: guide.count }),
      ),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("heading", { level: 3, name: guide.title }),
    ).toBeInTheDocument();
    expect(within(card).getByText(guide.description)).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("guide-index/guide-card/tag")
        .map((t) => t.textContent),
    ).toEqual([`#${t.coffee}`, "#One Bangkok"]);
  });

  it("links the title to the Guide, named by the title alone", () => {
    render(<GuideCard guide={guide} parentTestId="guide-index" />);

    const link = screen.getByTestId("guide-index/guide-card/link");
    expect(link).toBe(screen.getByRole("link", { name: guide.title }));
    expect(link).toHaveAttribute("href", "/guides/g1");
    expect(screen.getByTestId("guide-index/guide-card")).toBe(
      screen.getByRole("article"),
    );
  });

  it("links each Tag to the Guide Index filtered by it, or by the given href builder", () => {
    const { rerender } = render(<GuideCard guide={guide} />);
    expect(screen.getByRole("link", { name: t.coffee })).toHaveAttribute(
      "href",
      `/?${new URLSearchParams({ tag: t.coffee }).toString()}`,
    );

    rerender(<GuideCard guide={guide} tagHref={(tag) => `/?q=x&tag=${tag}`} />);
    expect(screen.getByRole("link", { name: t.coffee })).toHaveAttribute(
      "href",
      `/?q=x&tag=${t.coffee}`,
    );
  });

  it("describes the cover with the Guide title", () => {
    const { container } = render(<GuideCard guide={guide} priority />);

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", guide.title);
    expect(img).toHaveAttribute(
      "srcset",
      "http://img/r/854/480/a.jpg 854w, http://img/r/1920/1080/a.jpg 1920w",
    );
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("lazy-loads covers that are not a priority", () => {
    const { container } = render(<GuideCard guide={guide} />);

    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });
});
