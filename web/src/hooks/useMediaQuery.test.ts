import { act, renderHook } from "@testing-library/react";

import { useMediaQuery } from "./useMediaQuery";

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  );
  return {
    set(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("useMediaQuery", () => {
  it("reports the current match and follows changes", () => {
    const media = mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(width < 48rem)"));
    expect(result.current).toBe(true);

    act(() => media.set(false));

    expect(result.current).toBe(false);
  });
});
