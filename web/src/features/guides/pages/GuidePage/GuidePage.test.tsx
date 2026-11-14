import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";

import {
  GUIDE_ID,
  makeGuide,
  toGatewayJson,
} from "@/features/guides/lib/fixtures";
import type { Guide } from "@/features/guides/lib/types";
import { env } from "@/lib/env";
import { renderWithQueryClient } from "@/test-utils/queryClient";
import { server } from "@/test-utils/server";

import { GuidePage } from "./GuidePage";

const guideUrl = `${env.apiBaseUrl}/guides/${GUIDE_ID}`;

function serveGuide(guide: Guide = makeGuide()) {
  server.use(http.get(guideUrl, () => HttpResponse.json(toGatewayJson(guide))));
}

function renderPage(hash = "") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[`/guides/${GUIDE_ID}${hash}`]}>
      <GuidePage guideId={GUIDE_ID} />
    </MemoryRouter>,
  );
}

describe("GuidePage", () => {
  it("shows a layout-matched skeleton while the Guide loads", async () => {
    server.use(
      http.get(guideUrl, async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("กำลังโหลดไกด์…");
    expect(screen.getByTestId("guide/skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows the header and Guide Items in guide order, with socialTitle as the tab title", async () => {
    serveGuide();
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "10 คาเฟ่ลับ One Bangkok!",
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe(
      "ไม่อยากจะเชื่อ มีร้านคาเฟ่ดี ๆ แบบนี้ห้างดังย่านลุมพินี One Bangkok ด้วย",
    );
    const items = within(
      screen.getByRole("list", { name: "ร้านในไกด์นี้" }),
    ).getAllByTestId("guide/restaurant-card");
    expect(items).toHaveLength(4);
    expect(
      items.map(
        (item) => within(item).queryByRole("heading")?.textContent ?? null,
      ),
    ).toEqual([
      "ONIBUS COFFEE (สาขา One Bangkok)",
      "KFC (สาขา One Bangkok)",
      null,
      "% Arabica",
    ]);
    expect(screen.getByTestId("guide/back-link")).toHaveAttribute("href", "/");
  });

  it("keeps an Unavailable Restaurant's write-up and photos", async () => {
    serveGuide();
    renderPage();

    const unavailable = (
      await screen.findAllByTestId("guide/restaurant-card")
    )[2];
    expect(unavailable).toBeDefined();
    const card = within(unavailable as HTMLElement);
    expect(card.getByText("ไม่สามารถโหลดข้อมูลร้านได้")).toBeInTheDocument();
    expect(card.getByText("RISE ลุกขึ้นแล้วดื่มกาแฟ !")).toBeInTheDocument();
    expect(card.getByRole("img", { name: "รูปที่ 1 จาก 2" })).toBeInTheDocument();
    expect(card.getByRole("img", { name: "รูปที่ 2 จาก 2" })).toHaveAttribute(
      "data-state",
      "placeholder",
    );
  });

  it("clamps only the long write-up", async () => {
    serveGuide();
    renderPage();

    const readMore = await screen.findAllByRole("button", {
      name: "อ่านเพิ่มเติม",
    });
    expect(readMore).toHaveLength(1);
    expect(
      within(
        screen.getAllByTestId("guide/restaurant-card")[3] as HTMLElement,
      ).getByTestId("guide/restaurant-card/read-more"),
    ).toBe(readMore[0]);
  });

  it("shows an empty state for a Guide with no Guide Items", async () => {
    serveGuide(makeGuide({ items: [] }));
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "ไกด์นี้ยังไม่มีร้าน" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("guide/empty-state/action")).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("list", { name: "ร้านในไกด์นี้" }),
    ).not.toBeInTheDocument();
  });

  it("shows ไม่พบไกด์นี้ with a link to the Guide Index for a 404", async () => {
    server.use(
      http.get(guideUrl, () =>
        HttpResponse.json({ detail: "Guide not found" }, { status: 404 }),
      ),
    );
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "ไม่พบไกด์นี้" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("guide/not-found/back-link")).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("offers ลองใหม่ after a failure and recovers when the retry succeeds", async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get(guideUrl, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ detail: "Upstream timed out" }, { status: 504 })
          : HttpResponse.json(toGatewayJson(makeGuide()));
      }),
    );
    renderPage();

    const panel = await screen.findByTestId("guide/error-panel");
    expect(panel).toHaveRole("alert");
    expect(
      within(panel).getByRole("heading", { level: 1, name: "โหลดไกด์ไม่สำเร็จ" }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("guide/error-panel/retry"));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "10 คาเฟ่ลับ One Bangkok!",
      }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("treats a response that breaks the contract as an error and logs it", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    server.use(http.get(guideUrl, () => HttpResponse.json({ id: GUIDE_ID })));
    renderPage();

    expect(await screen.findByTestId("guide/error-panel")).toBeInTheDocument();
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    consoleError.mockRestore();
  });

  describe("sharing", () => {
    // jsdom has no scrollIntoView; the tests that need it install a mock.
    afterEach(() => {
      window.sessionStorage.clear();
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    it("shares the Guide and each available card", async () => {
      serveGuide();
      renderPage();

      expect(
        await screen.findByRole("button", { name: "แชร์ไกด์" }),
      ).toBeInTheDocument();
      expect(
        screen
          .getAllByTestId("guide/restaurant-card/share")
          .map((button) => button.getAttribute("aria-label")),
      ).toEqual(["แชร์ร้าน ONIBUS COFFEE", "แชร์ร้าน KFC", "แชร์ร้าน % Arabica"]);
    });

    it("scrolls to and highlights the card in a shared #item- link once the Guide renders", async () => {
      const guide = makeGuide();
      const target = guide.items[1];
      if (!target) throw new Error("fixture needs 2 items");

      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      serveGuide(guide);
      renderPage(`#item-${target.id}`);

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
      const cards = screen.getAllByTestId("guide/restaurant-card");
      expect(scrollIntoView.mock.contexts[0]).toBe(cards[1]);
      expect(cards[1]).toHaveAttribute("data-highlighted");
      expect(cards[0]).not.toHaveAttribute("data-highlighted");
    });

    it("opens normally for an unknown #item-", async () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      serveGuide();
      renderPage("#item-nope");

      await screen.findAllByTestId("guide/restaurant-card");
      expect(scrollIntoView).not.toHaveBeenCalled();
      for (const card of screen.getAllByTestId("guide/restaurant-card")) {
        expect(card).not.toHaveAttribute("data-highlighted");
      }
    });
  });
});
