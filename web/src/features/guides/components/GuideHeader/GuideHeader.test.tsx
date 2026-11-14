import { render, screen, within } from "@testing-library/react";

import { Header, HeaderSlotProvider } from "@/components/layout/Header";
import { guideShareTarget } from "@/features/guides/lib/share";
import { m } from "@/paraglide/messages.js";
import { makeGuide } from "@/test-utils/fixtures/guides";
import { formattedDates } from "@/test-utils/fixtures/sampleContent";

import { GuideHeader } from "./GuideHeader";

const share = guideShareTarget(makeGuide());

describe("GuideHeader", () => {
  it("shows the title, Tags as Guide Index links, the date in Thai and the description", () => {
    const guide = makeGuide();
    render(<GuideHeader guide={guide} parentTestId="guide" />);

    expect(
      screen.getByRole("heading", { level: 1, name: guide.title }),
    ).toBeInTheDocument();
    const tags = within(
      screen.getByRole("list", { name: m.guideHeader_tags_ariaLabel() }),
    ).getAllByRole("link");
    expect(tags.map((tag) => tag.textContent)).toEqual(
      guide.tags.map((tag) => `#${tag}`),
    );
    expect(tags[0]).toHaveAttribute(
      "href",
      "/?tag=%E0%B8%81%E0%B8%B2%E0%B9%81%E0%B8%9F",
    );
    expect(screen.getAllByTestId("guide/guide-header/tag")).toHaveLength(5);
    expect(screen.getByText(formattedDates.march10th2024)).toHaveAttribute(
      "datetime",
      "2024-03-10",
    );
    expect(
      screen.getByText(formattedDates.march10th2024).parentElement,
    ).toHaveTextContent(
      `${m.guideHeader_writeDate_label()} ${formattedDates.march10th2024} · ${m.guideHeader_restaurantCount_body({ count: 4 })}`,
    );
    expect(screen.getByText(guide.description)).toBeInTheDocument();
  });

  it("loads the cover first, described by the Guide title", () => {
    const guide = makeGuide();
    render(<GuideHeader guide={guide} />);
    const cover = screen.getByRole("img", { name: guide.title });
    expect(cover).toHaveAttribute("fetchpriority", "high");
    expect(cover).toHaveAttribute("loading", "eager");
    expect(cover.getAttribute("srcset")).toMatch(/ \d+w, .* \d+w$/);
  });

  it("puts the share button beside the title on desktop", () => {
    render(
      <GuideHeader guide={makeGuide()} share={share} parentTestId="guide" />,
    );

    const button = within(screen.getByTestId("guide/guide-header")).getByRole(
      "button",
      { name: m.guideHeader_share_label() },
    );
    expect(button).toHaveTextContent(m.guideHeader_share_label());
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
    expect(button).toHaveAccessibleName(m.guideHeader_share_label());
    expect(button).toHaveTextContent("");
    expect(screen.getByTestId("guide/guide-header")).not.toContainElement(
      button,
    );
  });

  it("has no share button without a share target", () => {
    render(<GuideHeader guide={makeGuide()} parentTestId="guide" />);

    expect(
      screen.queryByRole("button", { name: m.guideHeader_share_label() }),
    ).not.toBeInTheDocument();
  });
});
