import { render, screen, within } from "@testing-library/react";

import { GuideCard, type GuideCardGuide } from "./GuideCard";

const guide: GuideCardGuide = {
  title: "10 คาเฟ่ลับ One Bangkok!",
  count: 10,
  description: "รวมคาเฟ่เด็ดที่ One Bangkok",
  cover: [
    { url: "http://img/r/854/480/a.jpg", width: 854 },
    { url: "http://img/r/1920/1080/a.jpg", width: 1920 },
  ],
  tags: ["กาแฟ", "One Bangkok"],
  href: "/guides/g1",
};

describe("GuideCard", () => {
  it("shows the count, title, description and Tags of the Guide", () => {
    render(<GuideCard guide={guide} parentTestId="guide-index" />);

    const card = screen.getByRole("article");
    expect(within(card).getByText("10 ร้าน")).toBeInTheDocument();
    expect(
      within(card).getByRole("heading", { level: 3, name: guide.title }),
    ).toBeInTheDocument();
    expect(within(card).getByText(guide.description)).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("guide-index/guide-card/tag")
        .map((t) => t.textContent),
    ).toEqual(["#กาแฟ", "#One Bangkok"]);
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
    expect(screen.getByRole("link", { name: "กาแฟ" })).toHaveAttribute(
      "href",
      `/?${new URLSearchParams({ tag: "กาแฟ" }).toString()}`,
    );

    rerender(<GuideCard guide={guide} tagHref={(tag) => `/?q=x&tag=${tag}`} />);
    expect(screen.getByRole("link", { name: "กาแฟ" })).toHaveAttribute(
      "href",
      "/?q=x&tag=กาแฟ",
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
