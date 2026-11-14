import { render, screen, within } from "@testing-library/react";

import { makeGuide } from "@/features/guides/lib/fixtures";

import { GuideHeader } from "./GuideHeader";

describe("GuideHeader", () => {
  it("shows the title, Tags as Guide Index links, the date in Thai and the description", () => {
    render(<GuideHeader guide={makeGuide()} parentTestId="guide" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "10 คาเฟ่ลับ One Bangkok!" }),
    ).toBeInTheDocument();
    const tags = within(screen.getByRole("list", { name: "แท็ก" })).getAllByRole(
      "link",
    );
    expect(tags.map((tag) => tag.textContent)).toEqual([
      "#กาแฟ",
      "#คาเฟ่",
      "#กรุงเทพ",
      "#One",
      "#Bangkok",
    ]);
    expect(tags[0]).toHaveAttribute(
      "href",
      "/?tag=%E0%B8%81%E0%B8%B2%E0%B9%81%E0%B8%9F",
    );
    expect(screen.getAllByTestId("guide/guide-header/tag")).toHaveLength(5);
    expect(screen.getByText("10 มี.ค. 2567")).toHaveAttribute(
      "datetime",
      "2024-03-10",
    );
    expect(screen.getByText(/· 4 ร้าน/)).toBeInTheDocument();
    expect(screen.getByText(/รวมสุดยอดคาเฟ่ลับ/)).toBeInTheDocument();
  });

  it("loads the cover first, described by the Guide title", () => {
    render(<GuideHeader guide={makeGuide()} />);
    const cover = screen.getByRole("img", { name: "10 คาเฟ่ลับ One Bangkok!" });
    expect(cover).toHaveAttribute("fetchpriority", "high");
    expect(cover).toHaveAttribute("loading", "eager");
    expect(cover.getAttribute("srcset")).toMatch(/ \d+w, .* \d+w$/);
  });
});
