import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { showToast, toastQueue } from "@/components/common/Toast";
import { m } from "@/paraglide/messages.js";
import { sampleOverrides } from "@/test-utils/fixtures/sampleContent";

import { AppShell, guidePageTestIdFrom } from "./AppShell";

describe("AppShell", () => {
  it("shows toasts as app/toast, in a region React Aria keeps at the end of the body", () => {
    render(<AppShell>content</AppShell>);

    act(() => showToast({ message: m.guideHeader_share_copiedBody() }));

    expect(screen.getByTestId("app/toast")).toHaveTextContent(
      m.guideHeader_share_copiedBody(),
    );
    expect(
      screen.getByRole("region", { name: m.toast_region_ariaLabel() })
        .parentElement,
    ).toBe(document.body);
    act(() => {
      for (const toast of toastQueue.visibleToasts) toastQueue.close(toast.key);
    });
  });

  it("links the header to the Guide Index and renders the page in main", () => {
    render(
      <AppShell>
        <h1>{sampleOverrides.pageHeading}</h1>
      </AppShell>,
    );

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: m.header_logo_label(),
      }),
    ).toHaveAttribute("href", "/");
    expect(
      within(screen.getByRole("main")).getByRole("heading", { level: 1 }),
    ).toHaveTextContent(sampleOverrides.pageHeading);
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

    const skip = screen.getByRole("link", { name: m.app_skipLink_label() });
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
      m.header_backLink_ariaLabel(),
    );
    vi.restoreAllMocks();
  });

  it("has no back link on other pages", () => {
    render(<AppShell>content</AppShell>);
    expect(
      screen.queryByRole("link", { name: m.header_backLink_ariaLabel() }),
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
