import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import {
  createMemoryRouter,
  RouterProvider,
  useHref,
  useNavigate,
} from "react-router";

import { MAX_SEARCH_LENGTH } from "@/features/guide-index/lib/filters";
import type { GuideList } from "@/features/guide-index/lib/types";
import { env } from "@/lib/env";
import { m } from "@/paraglide/messages.js";
import {
  cafeGuide,
  guideIndexSearches as q,
  guideIndexTags as t,
  guideList,
  listOf,
  restaurantGuide,
} from "@/test-utils/fixtures/guideIndex";
import { sampleThaiText } from "@/test-utils/fixtures/sampleContent";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import { server } from "@/test-utils/server";

import { GuideIndexPage } from "./GuideIndexPage";

const GUIDES_URL = `${env.apiBaseUrl}/guides`;

/** Like the gateway: q matches title, description or a Tag; every tag must match. */
function filterGuides(url: URL): GuideList {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const tags = url.searchParams.getAll("tag");
  return listOf(
    ...guideList.items.filter(
      (guide) =>
        (!q ||
          [guide.title, guide.shortDescription, ...guide.tags].some((text) =>
            text.toLowerCase().includes(q),
          )) &&
        tags.every((tag) => guide.tags.includes(tag)),
    ),
  );
}

/** Serves the sample Guides and records every request's URL. */
function serveGuides() {
  const requests: URL[] = [];
  server.use(
    http.get(GUIDES_URL, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      return HttpResponse.json(filterGuides(url));
    }),
  );
  return requests;
}

const searches = (requests: URL[]) =>
  requests.map((url) => url.searchParams.get("q"));

function AriaRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider
      navigate={(to, options) => void navigate(to, options)}
      useHref={useHref}
    >
      {children}
    </AriaRouterProvider>
  );
}

function renderPage(url = "/") {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AriaRouter>
            <GuideIndexPage />
          </AriaRouter>
        ),
      },
      { path: "/guides/:guideId", element: <p>Guide page</p> },
    ],
    { initialEntries: [url] },
  );
  const { queryClient } = renderWithProviders(
    <RouterProvider router={router} />,
  );
  const location = () => router.state.location;
  const params = () => new URLSearchParams(location().search);
  return { router, queryClient, location, params };
}

const cardTitles = () =>
  screen
    .queryAllByTestId("guide-index/guide-card/link")
    .map((link) => link.textContent);

const searchBox = () =>
  screen.getByRole("searchbox", { name: m.searchField_label() });

/** The results count line, e.g. for 2 Guides. */
const resultCount = (count: number) => m.guideIndex_resultCount_body({ count });

const tooLongMessage = () =>
  m.guideIndex_search_tooLongMessage({ max: MAX_SEARCH_LENGTH });

/**
 * Replaces the search text in one change event (then presses Enter if asked), so a slow
 * test run can't let the 300 ms debounce fire on half-typed text.
 */
async function enterSearch(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
  { submit = false }: { submit?: boolean } = {},
) {
  await user.clear(searchBox());
  await user.paste(text);
  if (submit) await user.keyboard("{Enter}");
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Each test drives the real router, React Query and msw through several requests; give
// them headroom on a busy CI machine instead of the 5 s default.
describe("GuideIndexPage", { timeout: 15_000 }, () => {
  it("shows a skeleton, then a card per Guide linking to it, with the count", async () => {
    serveGuides();
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      m.guideIndex_skeleton_label(),
    );

    expect(await screen.findByText(resultCount(2))).toBeInTheDocument();
    expect(cardTitles()).toEqual([cafeGuide.title, restaurantGuide.title]);
    expect(screen.getByRole("link", { name: cafeGuide.title })).toHaveAttribute(
      "href",
      `/guides/${cafeGuide.id}`,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: m.guideIndex_title(),
      }),
    ).toBeInTheDocument();
  });

  it("offers every Tag across all Guides as a filter", async () => {
    serveGuides();
    renderPage();

    const filter = await screen.findByTestId("guide-index/tag-filter");
    expect(
      within(filter)
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual(
      [t.coffee, t.cafe, t.bangkok, t.one, t.bangkokLatin, t.restaurant].map(
        (tag) => `#${tag}`,
      ),
    );
  });

  it("searches 300 ms after typing stops: starting a search pushes, refining replaces", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const requests = serveGuides();
    const { params, router } = renderPage();
    await screen.findByText(resultCount(2));

    await user.type(searchBox(), q.restaurant);
    act(() => vi.advanceTimersByTime(250));
    expect(params().get("q")).toBeNull();

    act(() => vi.advanceTimersByTime(50));
    expect(params().get("q")).toBe(q.restaurant);
    // The first commit of a search adds an entry, so Back returns to the unfiltered view.
    expect(router.state.historyAction).toBe("PUSH");
    expect(await screen.findByText(resultCount(1))).toBeInTheDocument();
    // Only the finished text was sent, not one request per keystroke.
    expect(searches(requests)).toEqual([null, q.restaurant]);

    await enterSearch(user, q.cafe);
    act(() => vi.advanceTimersByTime(300));
    expect(params().get("q")).toBe(q.cafe);
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("drops a pending search when Back happens before the debounce fires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    serveGuides();
    const { params, router } = renderPage();
    await screen.findByText(resultCount(2));
    await enterSearch(user, q.cafe, { submit: true });
    expect(params().get("q")).toBe(q.cafe);

    await enterSearch(user, q.hiddenCafe);
    await act(() => router.navigate(-1));
    act(() => vi.advanceTimersByTime(300));

    // Back stays where it went: the half-typed text neither returns nor pushes a new entry.
    expect(params().get("q")).toBeNull();
    expect(searchBox()).toHaveValue("");
    expect(router.state.historyAction).toBe("POP");
  });

  it("drops a pending search when a Tag link is followed mid-typing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    serveGuides();
    const { params } = renderPage();
    await screen.findByText(resultCount(2));

    await enterSearch(user, "One");
    const card = screen.getAllByTestId("guide-index/guide-card")[0]!;
    await user.click(within(card).getByRole("link", { name: t.bangkok }));
    act(() => vi.advanceTimersByTime(300));

    expect(params().getAll("tag")).toEqual([t.bangkok]);
    expect(params().get("q")).toBeNull();
    // The box shows the view it landed on, not text the results ignore.
    expect(searchBox()).toHaveValue("");
  });

  it("searches immediately on Enter, adding a history entry", async () => {
    const user = userEvent.setup();
    const requests = serveGuides();
    const { params, router } = renderPage();
    await screen.findByText(resultCount(2));

    await enterSearch(user, q.ramen, { submit: true });

    expect(params().get("q")).toBe(q.ramen);
    expect(router.state.historyAction).toBe("PUSH");
    expect(
      await screen.findByRole("heading", {
        name: m.guideIndex_emptyState_searchTitle({ query: q.ramen }),
      }),
    ).toBeInTheDocument();
    expect(searches(requests)).toEqual([null, q.ramen]);

    // The pending debounce was cancelled: nothing more after 300 ms.
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(searches(requests)).toEqual([null, q.ramen]);
  });

  it("restores the search and Tags from the URL, and follows Back", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { router } = renderPage(`/?q=${q.cafe}&tag=${t.restaurant}`);

    expect(searchBox()).toHaveValue(q.cafe);
    expect(await screen.findByText(resultCount(1))).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: `#${t.restaurant}` }),
    ).toHaveAttribute("aria-selected", "true");

    await user.clear(searchBox());
    await enterSearch(user, "One", { submit: true });
    expect(router.state.location.search).toContain("q=One");

    await act(() => router.navigate(-1));

    expect(searchBox()).toHaveValue(q.cafe);
  });

  it("requires every selected Tag, combined with the search text", async () => {
    const user = userEvent.setup();
    const requests = serveGuides();
    const { params, router } = renderPage(`/?q=${q.cafe}`);
    await screen.findByText(resultCount(2));

    await user.click(screen.getByRole("row", { name: `#${t.coffee}` }));
    await user.click(screen.getByRole("row", { name: `#${t.restaurant}` }));

    expect(router.state.historyAction).toBe("PUSH");
    expect(params().getAll("tag")).toEqual([t.coffee, t.restaurant]);
    expect(await screen.findByText(resultCount(1))).toBeInTheDocument();
    const last = requests.at(-1);
    expect(last?.searchParams.get("q")).toBe(q.cafe);
    expect(last?.searchParams.getAll("tag")).toEqual([t.coffee, t.restaurant]);
  });

  it("adds a card's Tag to the current filters when it is clicked", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { params } = renderPage(`/?q=${q.cafe}`);
    await screen.findByText(resultCount(2));

    const card = screen.getAllByTestId("guide-index/guide-card")[1]!;
    await user.click(within(card).getByRole("link", { name: t.restaurant }));

    expect(params().get("q")).toBe(q.cafe);
    expect(params().getAll("tag")).toEqual([t.restaurant]);
    expect(await screen.findByText(resultCount(1))).toBeInTheDocument();
  });

  it("clears the search and Tags with clear all", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { location } = renderPage(`/?q=${q.restaurant}&tag=${t.coffee}`);
    await screen.findByText(resultCount(1));

    await user.click(screen.getByTestId("guide-index/clear-all"));

    expect(location().search).toBe("");
    expect(searchBox()).toHaveValue("");
    expect(await screen.findByText(resultCount(2))).toBeInTheDocument();
    expect(
      screen.queryByTestId("guide-index/clear-all"),
    ).not.toBeInTheDocument();
    // The button is gone, so focus moves to the search box rather than <body>.
    expect(searchBox()).toHaveFocus();
  });

  it("keeps the previous cards on screen while a new search loads", async () => {
    const user = userEvent.setup();
    serveGuides();
    renderPage();
    await screen.findByText(resultCount(2));
    server.use(
      http.get(GUIDES_URL, async () => {
        await delay("infinite");
        return HttpResponse.json(guideList);
      }),
    );

    await enterSearch(user, q.restaurant, { submit: true });

    expect(cardTitles()).toHaveLength(2);
    expect(screen.getByRole("list", { busy: true })).toBeInTheDocument();
  });

  it("never lets an older, slower response replace newer results", async () => {
    const user = userEvent.setup();
    let releaseOld: () => void = () => {};
    server.use(
      http.get(GUIDES_URL, async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("q") === q.cafe) {
          await new Promise<void>((resolve) => {
            releaseOld = resolve;
          });
          return HttpResponse.json(listOf(cafeGuide, restaurantGuide));
        }
        return HttpResponse.json(filterGuides(url));
      }),
    );
    renderPage();
    await screen.findByText(resultCount(2));

    await enterSearch(user, q.cafe, { submit: true });
    await user.clear(searchBox());
    await enterSearch(user, q.restaurant, { submit: true });
    expect(await screen.findByText(resultCount(1))).toBeInTheDocument();

    act(() => releaseOld());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText(resultCount(1))).toBeInTheDocument();
    expect(cardTitles()).toEqual([restaurantGuide.title]);
  });

  it("shows an empty state with a way back to every Guide", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { location } = renderPage(`/?q=${q.ramen}`);

    const empty = await screen.findByTestId("guide-index/empty-state");
    expect(
      within(empty).getByRole("heading", {
        name: m.guideIndex_emptyState_searchTitle({ query: q.ramen }),
      }),
    ).toBeInTheDocument();
    expect(
      within(empty).getByText(m.guideIndex_emptyState_body()),
    ).toBeInTheDocument();

    await user.click(
      within(empty).getByRole("button", {
        name: m.guideIndex_emptyState_action_label(),
      }),
    );
    expect(location().search).toBe("");
    expect(await screen.findByText(resultCount(2))).toBeInTheDocument();
    expect(searchBox()).toHaveValue("");
    expect(searchBox()).toHaveFocus();
  });

  it("names the selected Tags when only Tags match nothing", async () => {
    server.use(http.get(GUIDES_URL, () => HttpResponse.json(listOf())));
    renderPage(`/?tag=${q.ramen}`);

    expect(
      await screen.findByRole("heading", {
        name: m.guideIndex_emptyState_tagsTitle(),
      }),
    ).toBeInTheDocument();
  });

  it("keeps the results and offers an inline retry when a search fails", async () => {
    const user = userEvent.setup();
    serveGuides();
    renderPage();
    await screen.findByText(resultCount(2));
    let failing = true;
    server.use(
      http.get(GUIDES_URL, ({ request }) => {
        const url = new URL(request.url);
        if (failing && url.searchParams.get("q") === q.hiddenCafe) {
          return HttpResponse.json(
            { detail: "Upstream error" },
            { status: 502 },
          );
        }
        return HttpResponse.json(filterGuides(url));
      }),
    );

    await enterSearch(user, q.hiddenCafe, { submit: true });

    const panel = await screen.findByTestId("guide-index/error-panel");
    expect(panel).toHaveTextContent(
      m.guideIndex_errorPanel_searchBody({ query: q.hiddenCafe }),
    );
    expect(cardTitles()).toHaveLength(2);
    expect(screen.getByText(resultCount(2))).toBeInTheDocument();

    failing = false;
    await user.click(
      within(panel).getByRole("button", { name: m.errorPanel_retry_label() }),
    );

    expect(await screen.findByText(resultCount(1))).toBeInTheDocument();
    expect(
      screen.queryByTestId("guide-index/error-panel"),
    ).not.toBeInTheDocument();
  });

  it("shows a block error with retry when the first load fails", async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get(GUIDES_URL, ({ request }) =>
        failing
          ? HttpResponse.json({ detail: "Upstream error" }, { status: 502 })
          : HttpResponse.json(filterGuides(new URL(request.url))),
      ),
    );
    renderPage();

    const panel = await screen.findByTestId("guide-index/error-panel");
    expect(cardTitles()).toEqual([]);

    failing = false;
    await user.click(
      within(panel).getByRole("button", { name: m.errorPanel_retry_label() }),
    );

    expect(await screen.findByText(resultCount(2))).toBeInTheDocument();
  });

  it("rejects search text over 100 characters without sending it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const requests = serveGuides();
    const { params } = renderPage();
    await screen.findByText(resultCount(2));

    await user.click(searchBox());
    await user.paste(sampleThaiText.consonant.repeat(MAX_SEARCH_LENGTH + 1));
    await user.keyboard("{Enter}");
    act(() => vi.advanceTimersByTime(500));

    expect(searchBox()).toHaveAttribute("aria-invalid", "true");
    expect(searchBox()).toHaveAccessibleDescription(tooLongMessage());
    expect(params().get("q")).toBeNull();
    expect(searches(requests)).toEqual([null]);
    expect(cardTitles()).toHaveLength(2);
  });
});
