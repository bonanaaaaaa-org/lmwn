import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppShell, guidePageTestIdFrom } from "./AppShell";

describe("AppShell", () => {
  it("links the header to the Guide Index and renders the page in main", () => {
    render(
      <AppShell>
        <h1>ไกด์ทั้งหมด</h1>
      </AppShell>,
    );

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Guide to Hidden Gems",
      }),
    ).toHaveAttribute("href", "/");
    expect(
      within(screen.getByRole("main")).getByRole("heading", { level: 1 }),
    ).toHaveTextContent("ไกด์ทั้งหมด");
  });

  it("owns the app test ID and passes it down to the header and links", () => {
    render(<AppShell>content</AppShell>);

    expect(screen.getByTestId("app")).toContainElement(
      screen.getByRole("main"),
    );
    expect(screen.getByTestId("app/header")).toBe(screen.getByRole("banner"));
    expect(screen.getByTestId("app/header/logo")).toHaveAttribute("href", "/");
    expect(screen.getByTestId("app/skip-link")).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("offers a skip link to the main content as the first Tab stop", async () => {
    const user = userEvent.setup();
    render(<AppShell>content</AppShell>);

    await user.tab();

    const skip = screen.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", `#${screen.getByRole("main").id}`);
  });

  it("shows the phone Guide header with a back link when the page asks for it on a phone", () => {
    const desktopMatchMedia = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({ ...desktopMatchMedia(query), matches: true }) as MediaQueryList,
    );
    render(<AppShell guidePageTestId="guide">content</AppShell>);

    expect(screen.getByTestId("guide/back-link")).toHaveAccessibleName(
      "กลับไปไกด์ทั้งหมด",
    );
    vi.restoreAllMocks();
  });

  it("has no back link on other pages", () => {
    render(<AppShell>content</AppShell>);
    expect(
      screen.queryByRole("link", { name: "กลับไปไกด์ทั้งหมด" }),
    ).not.toBeInTheDocument();
  });

  it("reads the Guide page test ID from the deepest route handle that has one", () => {
    expect(
      guidePageTestIdFrom([
        { handle: undefined },
        { handle: { guidePageTestId: "guide" } },
        { handle: { other: true } },
      ]),
    ).toBe("guide");
    expect(guidePageTestIdFrom([{ handle: null }])).toBeUndefined();
  });
});
