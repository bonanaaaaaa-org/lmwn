import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";

import {
  everyDay,
  GUIDE_ID,
  makeGuide,
  sampleCategories as c,
  toGatewayJson,
} from "@/test-utils/fixtures/guides";
import type { Guide } from "@/features/guides/lib/types";
import { env } from "@/lib/env";
import { m } from "@/paraglide/messages.js";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import { server } from "@/test-utils/server";

import { GuidePage } from "./GuidePage";

const guideUrl = `${env.apiBaseUrl}/guides/${GUIDE_ID}`;

function serveGuide(guide: Guide = makeGuide()) {
  server.use(http.get(guideUrl, () => HttpResponse.json(toGatewayJson(guide))));
}

function renderPage(hash = "") {
  return renderWithProviders(
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

    expect(screen.getByRole("status")).toHaveTextContent(
      m.guide_skeleton_label(),
    );
    expect(screen.getByTestId("guide/skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows the header and Guide Items in guide order, with socialTitle as the tab title", async () => {
    const guide = makeGuide();
    serveGuide(guide);
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: guide.title }),
    ).toBeInTheDocument();
    expect(document.title).toBe(guide.socialTitle);
    const items = within(
      screen.getByRole("list", { name: m.guide_items_ariaLabel() }),
    ).getAllByTestId("guide/restaurant-card");
    expect(items).toHaveLength(4);
    expect(
      items.map(
        (item) => within(item).queryByRole("heading")?.textContent ?? null,
      ),
    ).toEqual([
      `ONIBUS COFFEE ${m.restaurantCard_branch_body({ branch: "One Bangkok" })}`,
      `KFC ${m.restaurantCard_branch_body({ branch: "One Bangkok" })}`,
      null,
      "% Arabica",
    ]);
    expect(screen.getByTestId("guide/back-link")).toHaveAttribute("href", "/");
  });

  it("keeps an Unavailable Restaurant's write-up and photos", async () => {
    const guide = makeGuide();
    serveGuide(guide);
    renderPage();

    const unavailable = (
      await screen.findAllByTestId("guide/restaurant-card")
    )[2];
    expect(unavailable).toBeDefined();
    const card = within(unavailable as HTMLElement);
    const photoAlt = (position: number) =>
      m.restaurantCard_photoStrip_photo_unnamedAlt({ position, total: 2 });
    expect(
      card.getByText(m.restaurantCard_unavailable_body()),
    ).toBeInTheDocument();
    expect(
      card.getByText(guide.items[2]?.description ?? ""),
    ).toBeInTheDocument();
    expect(card.getByRole("img", { name: photoAlt(1) })).toBeInTheDocument();
    expect(card.getByRole("img", { name: photoAlt(2) })).toHaveAttribute(
      "data-state",
      "placeholder",
    );
  });

  it("clamps only the long write-up", async () => {
    serveGuide();
    renderPage();

    const readMore = await screen.findAllByRole("button", {
      name: m.restaurantCard_readMore_label(),
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
      await screen.findByRole("heading", { name: m.guide_emptyState_title() }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("guide/empty-state/action")).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("list", { name: m.guide_items_ariaLabel() }),
    ).not.toBeInTheDocument();
  });

  it("says the Guide is not found, with a link to the Guide Index, for a 404", async () => {
    server.use(
      http.get(guideUrl, () =>
        HttpResponse.json({ detail: "Guide not found" }, { status: 404 }),
      ),
    );
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: m.guide_notFound_title(),
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("guide/not-found/back-link")).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("offers a retry after a failure and recovers when the retry succeeds", async () => {
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
      within(panel).getByRole("heading", {
        level: 1,
        name: m.guide_errorPanel_title(),
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("guide/error-panel/retry"));

    expect(
      await screen.findByRole("heading", { level: 1, name: makeGuide().title }),
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
        await screen.findByRole("button", {
          name: m.guideHeader_share_label(),
        }),
      ).toBeInTheDocument();
      expect(
        screen
          .getAllByTestId("guide/restaurant-card/share")
          .map((button) => button.getAttribute("aria-label")),
      ).toEqual(
        ["ONIBUS COFFEE", "KFC", "% Arabica"].map((restaurant) =>
          m.restaurantCard_share_ariaLabel({ restaurant }),
        ),
      );
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

  describe("filtering and sorting", () => {
    /** 2026-11-16 12:00 in Bangkok, a Monday: the fixture Restaurants (08:00–17:00) are open. */
    const NOON = new Date("2026-11-16T12:00:00+07:00");

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOON);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function renderRoutedPage(search = "") {
      const router = createMemoryRouter(
        [
          {
            path: "/guides/:guideId",
            element: <GuidePage guideId={GUIDE_ID} />,
          },
        ],
        { initialEntries: [`/guides/${GUIDE_ID}${search}`] },
      );
      renderWithProviders(<RouterProvider router={router} />);
      const params = () => new URLSearchParams(router.state.location.search);
      return { router, params };
    }

    /**
     * The shown cards' first name word (null for an Unavailable Restaurant) and guide-order
     * number: the badge, or the Unavailable card's accessible name, which carries it.
     */
    const shownCards = () =>
      screen.queryAllByTestId("guide/restaurant-card").map((card) => ({
        name:
          within(card).queryByRole("heading")?.textContent?.split(" ")[0] ??
          null,
        number:
          card.getAttribute("aria-label") ??
          card.textContent?.match(/^\d+/)?.[0],
      }));
    const names = () => shownCards().map(({ name }) => name);

    const count = (shown: number, total = 4) =>
      within(screen.getByTestId("guide/filters")).getByText(
        m.guideFilters_count_body({ shown, total }),
      );

    it("shows the toolbar with the Guide's Categories and every card counted", async () => {
      serveGuide();
      renderRoutedPage();

      expect(await screen.findByTestId("guide/filters")).toBeInTheDocument();
      expect(
        screen
          .getAllByTestId("guide/filters/category")
          .map((chip) => chip.textContent),
      ).toEqual([c.coffee, c.bakery, c.fastFood]);
      expect(count(4)).toBeInTheDocument();
      expect(names()).toEqual(["ONIBUS", "KFC", null, "%"]);
    });

    it("has no toolbar for a Guide with no Guide Items", async () => {
      serveGuide(makeGuide({ items: [] }));
      renderRoutedPage();

      await screen.findByRole("heading", { name: m.guide_emptyState_title() });
      expect(screen.queryByTestId("guide/filters")).not.toBeInTheDocument();
    });

    it("filters by a Category chip, writing it to the URL and hiding Unavailable Restaurants", async () => {
      const user = userEvent.setup();
      serveGuide();
      const { params } = renderRoutedPage();

      await user.click(await screen.findByRole("button", { name: c.coffee }));

      expect(params().getAll("category")).toEqual([c.coffee]);
      expect(names()).toEqual(["ONIBUS", "%"]);
      expect(count(2)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: c.coffee })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("keeps each card's guide-order number while filtered", async () => {
      serveGuide();
      renderRoutedPage("?category=" + encodeURIComponent(c.coffee));

      await screen.findAllByTestId("guide/restaurant-card");
      expect(shownCards().map(({ number }) => number)).toEqual(["1", "4"]);
    });

    it("restores the filters and sort from the URL on load", async () => {
      serveGuide();
      renderRoutedPage("?delivery=1&sort=rating");

      expect(
        await screen.findByRole("button", {
          name: m.guideFilters_delivery_label(),
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByTestId("guide/filters/sort-select/trigger"),
      ).toHaveTextContent(m.sortSelect_rating_label());
      expect(names()).toEqual(["ONIBUS", "KFC"]);
      expect(count(2)).toBeInTheDocument();
    });

    it("sorts by Rating with Unrated after the rated and Unavailable last", async () => {
      const user = userEvent.setup();
      serveGuide();
      const { params } = renderRoutedPage();

      await user.click(
        await screen.findByTestId("guide/filters/sort-select/trigger"),
      );
      await user.click(
        screen.getByRole("option", { name: m.sortSelect_rating_label() }),
      );

      expect(params().get("sort")).toBe("rating");
      expect(names()).toEqual(["ONIBUS", "KFC", "%", null]);
      expect(shownCards().map(({ number }) => number)).toEqual([
        "1",
        "2",
        "4",
        m.restaurantCard_unavailable_ariaLabel({ index: 3 }),
      ]);
    });

    it("filters by Open Now on Thailand time", async () => {
      const user = userEvent.setup();
      const guide = makeGuide();
      const kfc = guide.items[1]?.restaurant;
      if (!kfc) throw new Error("fixture needs KFC");
      kfc.workingHours = everyDay(1080, 1320); // 18:00–22:00
      serveGuide(guide);
      const { params } = renderRoutedPage();

      await user.click(
        await screen.findByRole("button", {
          name: m.guideFilters_openNow_label(),
        }),
      );

      expect(params().get("openNow")).toBe("1");
      expect(names()).toEqual(["ONIBUS", "%"]);
    });

    /** Moves the shared minute clock on: useNow re-reads the time when the tab is shown. */
    const advanceClockTo = (date: Date) =>
      act(() => {
        vi.setSystemTime(date);
        document.dispatchEvent(new Event("visibilitychange"));
      });

    it("drops a Restaurant from Open Now when it closes while the page is open", async () => {
      const guide = makeGuide();
      const kfc = guide.items[1]?.restaurant;
      if (!kfc) throw new Error("fixture needs KFC");
      kfc.workingHours = everyDay(480, 750); // 08:00–12:30
      serveGuide(guide);
      renderRoutedPage("?openNow=1");

      await screen.findAllByTestId("guide/restaurant-card");
      expect(names()).toEqual(["ONIBUS", "KFC", "%"]);

      await advanceClockTo(new Date("2026-11-16T12:31:00+07:00"));

      expect(names()).toEqual(["ONIBUS", "%"]);
      expect(count(2)).toBeInTheDocument();
    });

    it("follows a shared #item- link once, not again on each minute tick", async () => {
      const guide = makeGuide();
      const target = guide.items[1];
      if (!target) throw new Error("fixture needs 2 items");
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      // Blocked storage: the hook can't remember the link was followed.
      const getItem = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("blocked");
        });
      try {
        serveGuide(guide);
        renderRoutedPage(`#item-${target.id}`);
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

        await advanceClockTo(new Date("2026-11-16T12:01:00+07:00"));
        await advanceClockTo(new Date("2026-11-16T12:02:00+07:00"));

        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      } finally {
        getItem.mockRestore();
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
    });

    it("offers to clear the filters when nothing matches, keeping the sort", async () => {
      const user = userEvent.setup();
      serveGuide();
      const { params } = renderRoutedPage(
        "?category=" + encodeURIComponent(c.fastFood) + "&pickup=1&sort=rating",
      );

      const empty = await screen.findByTestId("guide/empty-state");
      expect(
        within(empty).getByRole("heading", {
          name: m.guide_emptyState_filteredTitle(),
        }),
      ).toBeInTheDocument();
      expect(
        within(empty).getByText(
          m.guideFilters_count_body({ shown: 0, total: 4 }),
        ),
      ).toBeInTheDocument();
      expect(count(0)).toBeInTheDocument();
      expect(
        screen.queryByRole("list", { name: m.guide_items_ariaLabel() }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByTestId("guide/empty-state/action"));

      expect([...params().entries()]).toEqual([["sort", "rating"]]);
      expect(names()).toEqual(["ONIBUS", "KFC", "%", null]);
      expect(screen.queryByTestId("guide/empty-state")).not.toBeInTheDocument();
      // The pressed button is gone, so focus lands on the toolbar, not the page body.
      expect(screen.getByTestId("guide/filters")).toHaveFocus();
    });

    it("steps back through filter changes with Back", async () => {
      const user = userEvent.setup();
      serveGuide();
      const { router, params } = renderRoutedPage();

      await user.click(
        await screen.findByRole("button", {
          name: m.guideFilters_delivery_label(),
        }),
      );
      await user.click(
        screen.getByRole("button", { name: m.guideFilters_pickup_label() }),
      );
      expect(names()).toEqual(["ONIBUS"]);

      await act(() => router.navigate(-1));

      expect(params().get("pickup")).toBeNull();
      expect(params().get("delivery")).toBe("1");
      expect(names()).toEqual(["ONIBUS", "KFC"]);
    });

    it("ignores Categories the Guide doesn't have", async () => {
      serveGuide();
      renderRoutedPage("?category=" + encodeURIComponent(c.cafe));

      await screen.findAllByTestId("guide/restaurant-card");
      expect(names()).toEqual(["ONIBUS", "KFC", null, "%"]);
      expect(count(4)).toBeInTheDocument();
    });
  });
});
