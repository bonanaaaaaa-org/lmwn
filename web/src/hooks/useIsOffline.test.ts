import { act, renderHook } from "@testing-library/react";

import { useIsOffline } from "./useIsOffline";

function setOnLine(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

describe("useIsOffline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is false while the browser is online", () => {
    const { result } = renderHook(() => useIsOffline());

    expect(result.current).toBe(false);
  });

  it("follows the browser going offline and back online", () => {
    const { result } = renderHook(() => useIsOffline());

    act(() => setOnLine(false));
    expect(result.current).toBe(true);

    act(() => setOnLine(true));
    expect(result.current).toBe(false);
  });
});
