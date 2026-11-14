import { act, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";

import {
  FOLLOWED_KEY,
  forgetLinksFollowedInEarlierPageLoads,
  HIGHLIGHT_MS,
  REDUCED_MOTION_QUERY,
  useGuideItemHashTarget,
} from "./useGuideItemHashTarget";

const IDS = ["a", "b", "c"];

function addCards(ids: readonly string[]) {
  const scrolls = new Map<string, ReturnType<typeof vi.fn>>();
  for (const id of ids) {
    const card = document.createElement("article");
    card.id = `item-${id}`;
    const scrollIntoView = vi.fn();
    card.scrollIntoView = scrollIntoView;
    scrolls.set(id, scrollIntoView);
    document.body.append(card);
  }
  return scrolls;
}

function stubReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === REDUCED_MOTION_QUERY && matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

/** Renders the hook on a Guide route; `result.current` is its latest value. */
function renderAt(initialEntry: string, initialIds?: readonly string[]) {
  const result: { current: string | undefined } = { current: undefined };
  let navigate: ReturnType<typeof useNavigate> = () => {};
  let ids = initialIds;
  function Probe() {
    result.current = useGuideItemHashTarget(ids);
    navigate = useNavigate();
    return null;
  }
  function Away() {
    navigate = useNavigate();
    return null;
  }
  const ui = () => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/guides/:guideId" element={<Probe />} />
        <Route path="/" element={<Away />} />
      </Routes>
    </MemoryRouter>
  );
  const view = render(ui());
  return {
    result,
    navigate: (to: string | number) =>
      act(() => {
        void (typeof to === "number" ? navigate(to) : navigate(to));
      }),
    setIds(next: readonly string[]) {
      ids = next;
      view.rerender(ui());
    },
    unmount: view.unmount,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  window.sessionStorage.clear();
});

describe("useGuideItemHashTarget", () => {
  it("waits for the cards, then scrolls smoothly to the shared one and highlights it briefly", () => {
    const scrolls = addCards(IDS);
    const view = renderAt("/guides/g1#item-b");

    expect(view.result.current).toBeUndefined();
    expect(scrolls.get("b")).not.toHaveBeenCalled();

    view.setIds(IDS);

    expect(scrolls.get("b")).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(view.result.current).toBe("b");

    act(() => vi.advanceTimersByTime(HIGHLIGHT_MS));
    expect(view.result.current).toBeUndefined();
  });

  it("jumps without smooth scrolling under reduced motion", () => {
    stubReducedMotion(true);
    const scrolls = addCards(IDS);

    renderAt("/guides/g1#item-c", IDS);

    expect(scrolls.get("c")).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it.each(["#item-nope", "#main-content", ""])(
    "opens normally for %j",
    (hash) => {
      const scrolls = addCards(IDS);

      const view = renderAt(`/guides/g1${hash}`, IDS);

      expect(view.result.current).toBeUndefined();
      for (const scroll of scrolls.values())
        expect(scroll).not.toHaveBeenCalled();
    },
  );

  it("follows a link once, so re-rendering with new data doesn't scroll again", () => {
    const scrolls = addCards(IDS);
    const view = renderAt("/guides/g1#item-a", IDS);

    view.setIds([...IDS]);

    expect(scrolls.get("a")).toHaveBeenCalledTimes(1);
  });

  it("doesn't scroll again when the diner comes Back to the page", () => {
    const scrolls = addCards(IDS);
    const view = renderAt("/guides/g1#item-a", IDS);
    expect(scrolls.get("a")).toHaveBeenCalledTimes(1);

    view.navigate("/");
    view.navigate(-1);

    expect(scrolls.get("a")).toHaveBeenCalledTimes(1);
    expect(view.result.current).toBeUndefined();
  });

  // A full page load always starts on React Router's "default" key, so the followed entry
  // from an earlier load of the same link looks identical to this one.
  describe("on a new page load in the same tab", () => {
    function followInEarlierLoad() {
      const earlier = addCards(IDS);
      const view = renderAt("/guides/g1#item-a", IDS);
      expect(earlier.get("a")).toHaveBeenCalledTimes(1);
      view.unmount();
      document.body.replaceChildren();
    }

    it("follows the same share link again when it is opened again", () => {
      followInEarlierLoad();

      forgetLinksFollowedInEarlierPageLoads("navigate");
      const scrolls = addCards(IDS);
      const view = renderAt("/guides/g1#item-a", IDS);

      expect(scrolls.get("a")).toHaveBeenCalledTimes(1);
      expect(view.result.current).toBe("a");
    });

    it.each(["reload", "back_forward"] as const)(
      "doesn't jump to the card again on %s",
      (type) => {
        followInEarlierLoad();

        forgetLinksFollowedInEarlierPageLoads(type);
        const scrolls = addCards(IDS);
        renderAt("/guides/g1#item-a", IDS);

        expect(scrolls.get("a")).not.toHaveBeenCalled();
      },
    );

    it("keeps links followed in other history entries", () => {
      const scrolls = addCards(IDS);
      const view = renderAt("/guides/g1", IDS);
      view.navigate("/guides/g1#item-c");
      expect(scrolls.get("c")).toHaveBeenCalledTimes(1);
      const stored = window.sessionStorage.getItem(FOLLOWED_KEY);

      forgetLinksFollowedInEarlierPageLoads("navigate");

      expect(window.sessionStorage.getItem(FOLLOWED_KEY)).toBe(stored);
    });
  });

  it("follows a new share link opened on the same page", () => {
    const scrolls = addCards(IDS);
    const view = renderAt("/guides/g1", IDS);

    view.navigate("/guides/g1#item-c");

    expect(scrolls.get("c")).toHaveBeenCalledTimes(1);
    expect(view.result.current).toBe("c");
  });
});
