import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";

import {
  GUIDE_ID,
  makeGuide,
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

function renderPage() {
  return renderWithProviders(<GuidePage guideId={GUIDE_ID} />);
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
      m.guidePageSkeleton_label(),
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
});
