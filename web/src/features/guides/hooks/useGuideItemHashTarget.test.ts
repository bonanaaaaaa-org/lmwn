import { act, renderHook } from "@testing-library/react";

import {
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

function setHash(hash: string) {
  window.history.replaceState(null, "", `/guides/g1${hash}`);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  setHash("");
});

describe("useGuideItemHashTarget", () => {
  it("waits for the cards, then scrolls smoothly to the shared one and highlights it briefly", () => {
    const scrolls = addCards(IDS);
    setHash("#item-b");
    const { result, rerender } = renderHook(
      ({ ids }: { ids?: readonly string[] }) => useGuideItemHashTarget(ids),
      { initialProps: {} },
    );

    expect(result.current).toBeUndefined();
    expect(scrolls.get("b")).not.toHaveBeenCalled();

    rerender({ ids: IDS });

    expect(scrolls.get("b")).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(result.current).toBe("b");

    act(() => vi.advanceTimersByTime(HIGHLIGHT_MS));
    expect(result.current).toBeUndefined();
  });

  it("jumps without smooth scrolling under reduced motion", () => {
    stubReducedMotion(true);
    const scrolls = addCards(IDS);
    setHash("#item-c");

    renderHook(() => useGuideItemHashTarget(IDS));

    expect(scrolls.get("c")).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it("opens normally for an unknown Guide Item", () => {
    const scrolls = addCards(IDS);
    setHash("#item-nope");

    const { result } = renderHook(() => useGuideItemHashTarget(IDS));

    expect(result.current).toBeUndefined();
    for (const scroll of scrolls.values())
      expect(scroll).not.toHaveBeenCalled();
  });

  it("ignores hashes that aren't share links", () => {
    const scrolls = addCards(IDS);
    setHash("#main-content");

    const { result } = renderHook(() => useGuideItemHashTarget(IDS));

    expect(result.current).toBeUndefined();
    for (const scroll of scrolls.values())
      expect(scroll).not.toHaveBeenCalled();
  });

  it("follows a hash once, so re-rendering with new data doesn't scroll again", () => {
    const scrolls = addCards(IDS);
    setHash("#item-a");
    const { rerender } = renderHook(
      ({ ids }: { ids: readonly string[] }) => useGuideItemHashTarget(ids),
      { initialProps: { ids: IDS } },
    );

    rerender({ ids: [...IDS] });

    expect(scrolls.get("a")).toHaveBeenCalledTimes(1);
  });

  it("follows a new share link opened on the same page", () => {
    const scrolls = addCards(IDS);
    const { result } = renderHook(() => useGuideItemHashTarget(IDS));
    expect(result.current).toBeUndefined();

    act(() => {
      setHash("#item-c");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(scrolls.get("c")).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("c");
  });
});
