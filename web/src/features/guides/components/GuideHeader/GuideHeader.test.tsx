import { render, screen, within } from "@testing-library/react";

import { Header, HeaderSlotProvider } from "@/components/layout/Header";
import { makeGuide } from "@/features/guides/lib/fixtures";

import { GuideHeader } from "./GuideHeader";

const share = {
  title: "10 คาเฟ่ลับ One Bangkok!",
  text: "socialTitle",
  url: "/guides/g1",
  copiedMessage: "คัดลอกลิงก์แล้ว",
};

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

  it("puts the แชร์ไกด์ button beside the title on desktop", () => {
    render(
      <GuideHeader guide={makeGuide()} share={share} parentTestId="guide" />,
    );

    const button = within(screen.getByTestId("guide/guide-header")).getByRole(
      "button",
      { name: "แชร์ไกด์" },
    );
    expect(button).toHaveTextContent("แชร์ไกด์");
    expect(button).toHaveAttribute("data-testid", "guide/guide-header/share");
  });

  it("moves the share button into the app header on a phone", () => {
    render(
      <HeaderSlotProvider>
        <Header layout="phone-guide" parentTestId="app" />
        <GuideHeader
          guide={makeGuide()}
          layout="phone"
          share={share}
          parentTestId="guide"
        />
      </HeaderSlotProvider>,
    );

    const button = screen.getByTestId("guide/guide-header/share");
    expect(screen.getByTestId("app/header")).toContainElement(button);
    expect(button).toHaveAccessibleName("แชร์ไกด์");
    expect(button).toHaveTextContent("");
    expect(screen.getByTestId("guide/guide-header")).not.toContainElement(
      button,
    );
  });

  it("has no share button without a share target", () => {
    render(<GuideHeader guide={makeGuide()} parentTestId="guide" />);

    expect(
      screen.queryByRole("button", { name: "แชร์ไกด์" }),
    ).not.toBeInTheDocument();
  });
});
