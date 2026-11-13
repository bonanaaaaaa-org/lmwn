import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("links the header to the Guide Index and renders the page in main", () => {
    render(
      <AppShell>
        <h1>ไกด์ทั้งหมด</h1>
      </AppShell>,
    );

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: /Hidden Gems/,
      }),
    ).toHaveAttribute("href", "/");
    expect(
      within(screen.getByRole("main")).getByRole("heading", { level: 1 }),
    ).toHaveTextContent("ไกด์ทั้งหมด");
  });

  it("offers a skip link to the main content as the first Tab stop", async () => {
    const user = userEvent.setup();
    render(<AppShell>content</AppShell>);

    await user.tab();

    const skip = screen.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", `#${screen.getByRole("main").id}`);
  });
});
