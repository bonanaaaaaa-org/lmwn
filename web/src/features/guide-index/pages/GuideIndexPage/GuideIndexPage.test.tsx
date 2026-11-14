import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import {
  createMemoryRouter,
  RouterProvider,
  useHref,
  useNavigate,
} from "react-router";

import {
  cafeGuide,
  guideList,
  listOf,
  restaurantGuide,
} from "@/features/guide-index/lib/fixtures";
import type { GuideList } from "@/features/guide-index/lib/types";
import { env } from "@/lib/env";
import { createTestQueryClient } from "@/test-utils/queryClient";
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
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const location = () => router.state.location;
  const params = () => new URLSearchParams(location().search);
  return { router, queryClient, location, params };
}

const cardTitles = () =>
  screen
    .queryAllByTestId("guide-index/guide-card/link")
    .map((link) => link.textContent);

const searchBox = () => screen.getByRole("searchbox", { name: "ค้นหาไกด์" });

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

    expect(screen.getByRole("status")).toHaveTextContent("กำลังโหลดไกด์…");

    expect(await screen.findByText("พบ 2 ไกด์")).toBeInTheDocument();
    expect(cardTitles()).toEqual([cafeGuide.title, restaurantGuide.title]);
    expect(screen.getByRole("link", { name: cafeGuide.title })).toHaveAttribute(
      "href",
      `/guides/${cafeGuide.id}`,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "หาร้านที่ใช่ จากไกด์ที่คัดมาแล้ว",
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
    ).toEqual(["#กาแฟ", "#คาเฟ่", "#กรุงเทพ", "#One", "#Bangkok", "#ร้านอาหาร"]);
  });

  it("searches 300 ms after typing stops: starting a search pushes, refining replaces", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const requests = serveGuides();
    const { params, router } = renderPage();
    await screen.findByText("พบ 2 ไกด์");

    await user.type(searchBox(), "ร้านอาหาร");
    act(() => vi.advanceTimersByTime(250));
    expect(params().get("q")).toBeNull();

    act(() => vi.advanceTimersByTime(50));
    expect(params().get("q")).toBe("ร้านอาหาร");
    // The first commit of a search adds an entry, so Back returns to the unfiltered view.
    expect(router.state.historyAction).toBe("PUSH");
    expect(await screen.findByText("พบ 1 ไกด์")).toBeInTheDocument();
    // Only the finished text was sent, not one request per keystroke.
    expect(searches(requests)).toEqual([null, "ร้านอาหาร"]);

    await enterSearch(user, "คาเฟ่");
    act(() => vi.advanceTimersByTime(300));
    expect(params().get("q")).toBe("คาเฟ่");
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("drops a pending search when Back happens before the debounce fires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    serveGuides();
    const { params, router } = renderPage();
    await screen.findByText("พบ 2 ไกด์");
    await enterSearch(user, "คาเฟ่", { submit: true });
    expect(params().get("q")).toBe("คาเฟ่");

    await enterSearch(user, "คาเฟ่ลับ");
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
    await screen.findByText("พบ 2 ไกด์");

    await enterSearch(user, "One");
    const card = screen.getAllByTestId("guide-index/guide-card")[0]!;
    await user.click(within(card).getByRole("link", { name: "กรุงเทพ" }));
    act(() => vi.advanceTimersByTime(300));

    expect(params().getAll("tag")).toEqual(["กรุงเทพ"]);
    expect(params().get("q")).toBeNull();
    // The box shows the view it landed on, not text the results ignore.
    expect(searchBox()).toHaveValue("");
  });

  it("searches immediately on Enter, adding a history entry", async () => {
    const user = userEvent.setup();
    const requests = serveGuides();
    const { params, router } = renderPage();
    await screen.findByText("พบ 2 ไกด์");

    await enterSearch(user, "ราเมน", { submit: true });

    expect(params().get("q")).toBe("ราเมน");
    expect(router.state.historyAction).toBe("PUSH");
    expect(
      await screen.findByRole("heading", { name: "ไม่พบไกด์ที่ตรงกับ “ราเมน”" }),
    ).toBeInTheDocument();
    expect(searches(requests)).toEqual([null, "ราเมน"]);

    // The pending debounce was cancelled: nothing more after 300 ms.
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(searches(requests)).toEqual([null, "ราเมน"]);
  });

  it("restores the search and Tags from the URL, and follows Back", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { router } = renderPage("/?q=คาเฟ่&tag=ร้านอาหาร");

    expect(searchBox()).toHaveValue("คาเฟ่");
    expect(await screen.findByText("พบ 1 ไกด์")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "#ร้านอาหาร" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.clear(searchBox());
    await enterSearch(user, "One", { submit: true });
    expect(router.state.location.search).toContain("q=One");

    await act(() => router.navigate(-1));

    expect(searchBox()).toHaveValue("คาเฟ่");
  });

  it("requires every selected Tag, combined with the search text", async () => {
    const user = userEvent.setup();
    const requests = serveGuides();
    const { params, router } = renderPage("/?q=คาเฟ่");
    await screen.findByText("พบ 2 ไกด์");

    await user.click(screen.getByRole("row", { name: "#กาแฟ" }));
    await user.click(screen.getByRole("row", { name: "#ร้านอาหาร" }));

    expect(router.state.historyAction).toBe("PUSH");
    expect(params().getAll("tag")).toEqual(["กาแฟ", "ร้านอาหาร"]);
    expect(await screen.findByText("พบ 1 ไกด์")).toBeInTheDocument();
    const last = requests.at(-1);
    expect(last?.searchParams.get("q")).toBe("คาเฟ่");
    expect(last?.searchParams.getAll("tag")).toEqual(["กาแฟ", "ร้านอาหาร"]);
  });

  it("adds a card's Tag to the current filters when it is clicked", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { params } = renderPage("/?q=คาเฟ่");
    await screen.findByText("พบ 2 ไกด์");

    const card = screen.getAllByTestId("guide-index/guide-card")[1]!;
    await user.click(within(card).getByRole("link", { name: "ร้านอาหาร" }));

    expect(params().get("q")).toBe("คาเฟ่");
    expect(params().getAll("tag")).toEqual(["ร้านอาหาร"]);
    expect(await screen.findByText("พบ 1 ไกด์")).toBeInTheDocument();
  });

  it("clears the search and Tags with ล้างทั้งหมด", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { location } = renderPage("/?q=ร้านอาหาร&tag=กาแฟ");
    await screen.findByText("พบ 1 ไกด์");

    await user.click(screen.getByTestId("guide-index/clear-all"));

    expect(location().search).toBe("");
    expect(searchBox()).toHaveValue("");
    expect(await screen.findByText("พบ 2 ไกด์")).toBeInTheDocument();
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
    await screen.findByText("พบ 2 ไกด์");
    server.use(
      http.get(GUIDES_URL, async () => {
        await delay("infinite");
        return HttpResponse.json(guideList);
      }),
    );

    await enterSearch(user, "ร้านอาหาร", { submit: true });

    expect(cardTitles()).toHaveLength(2);
    expect(screen.getByRole("list", { busy: true })).toBeInTheDocument();
  });

  it("never lets an older, slower response replace newer results", async () => {
    const user = userEvent.setup();
    let releaseOld: () => void = () => {};
    server.use(
      http.get(GUIDES_URL, async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("q") === "คาเฟ่") {
          await new Promise<void>((resolve) => {
            releaseOld = resolve;
          });
          return HttpResponse.json(listOf(cafeGuide, restaurantGuide));
        }
        return HttpResponse.json(filterGuides(url));
      }),
    );
    renderPage();
    await screen.findByText("พบ 2 ไกด์");

    await enterSearch(user, "คาเฟ่", { submit: true });
    await user.clear(searchBox());
    await enterSearch(user, "ร้านอาหาร", { submit: true });
    expect(await screen.findByText("พบ 1 ไกด์")).toBeInTheDocument();

    act(() => releaseOld());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText("พบ 1 ไกด์")).toBeInTheDocument();
    expect(cardTitles()).toEqual([restaurantGuide.title]);
  });

  it("shows an empty state with a way back to every Guide", async () => {
    const user = userEvent.setup();
    serveGuides();
    const { location } = renderPage("/?q=ราเมน");

    const empty = await screen.findByTestId("guide-index/empty-state");
    expect(
      within(empty).getByRole("heading", { name: "ไม่พบไกด์ที่ตรงกับ “ราเมน”" }),
    ).toBeInTheDocument();
    expect(
      within(empty).getByText("ลองใช้คำที่สั้นลง หรือเอาแท็กออกเพื่อดูไกด์ทั้งหมด"),
    ).toBeInTheDocument();

    await user.click(within(empty).getByRole("button", { name: "ล้างการค้นหา" }));
    expect(location().search).toBe("");
    expect(await screen.findByText("พบ 2 ไกด์")).toBeInTheDocument();
    expect(searchBox()).toHaveValue("");
    expect(searchBox()).toHaveFocus();
  });

  it("names the selected Tags when only Tags match nothing", async () => {
    server.use(http.get(GUIDES_URL, () => HttpResponse.json(listOf())));
    renderPage("/?tag=ราเมน");

    expect(
      await screen.findByRole("heading", { name: "ไม่พบไกด์ที่มีแท็กที่เลือก" }),
    ).toBeInTheDocument();
  });

  it("keeps the results and offers an inline retry when a search fails", async () => {
    const user = userEvent.setup();
    serveGuides();
    renderPage();
    await screen.findByText("พบ 2 ไกด์");
    let failing = true;
    server.use(
      http.get(GUIDES_URL, ({ request }) => {
        const url = new URL(request.url);
        if (failing && url.searchParams.get("q") === "คาเฟ่ลับ") {
          return HttpResponse.json(
            { detail: "Upstream error" },
            { status: 502 },
          );
        }
        return HttpResponse.json(filterGuides(url));
      }),
    );

    await enterSearch(user, "คาเฟ่ลับ", { submit: true });

    const panel = await screen.findByTestId("guide-index/error-panel");
    expect(panel).toHaveTextContent(
      "ค้นหา “คาเฟ่ลับ” ไม่สำเร็จ ผลที่แสดงอยู่เป็นผลก่อนหน้า",
    );
    expect(cardTitles()).toHaveLength(2);
    expect(screen.getByText("พบ 2 ไกด์")).toBeInTheDocument();

    failing = false;
    await user.click(within(panel).getByRole("button", { name: "ลองใหม่" }));

    expect(await screen.findByText("พบ 1 ไกด์")).toBeInTheDocument();
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
    await user.click(within(panel).getByRole("button", { name: "ลองใหม่" }));

    expect(await screen.findByText("พบ 2 ไกด์")).toBeInTheDocument();
  });

  it("rejects search text over 100 characters without sending it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const requests = serveGuides();
    const { params } = renderPage();
    await screen.findByText("พบ 2 ไกด์");

    await user.click(searchBox());
    await user.paste("ก".repeat(101));
    await user.keyboard("{Enter}");
    act(() => vi.advanceTimersByTime(500));

    expect(searchBox()).toHaveAttribute("aria-invalid", "true");
    expect(searchBox()).toHaveAccessibleDescription("คำค้นหายาวเกิน 100 ตัวอักษร");
    expect(params().get("q")).toBeNull();
    expect(searches(requests)).toEqual([null]);
    expect(cardTitles()).toHaveLength(2);
  });
});
