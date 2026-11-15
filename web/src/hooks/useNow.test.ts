import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNow } from "./useNow";

describe("useNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Temporal.Instant.from("2026-11-18T09:59:30+07:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current time", () => {
    const { result } = renderHook(() => useNow());
    expect(result.current.epochMilliseconds).toBe(
      Temporal.Instant.from("2026-11-18T09:59:00+07:00").epochMilliseconds,
    );
  });

  it("moves on when the minute changes, so Open Now follows the clock", () => {
    const { result } = renderHook(() => useNow());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.epochMilliseconds).toBe(
      Temporal.Instant.from("2026-11-18T10:00:00+07:00").epochMilliseconds,
    );
    act(() => {
      vi.advanceTimersByTime(60 * 60_000);
    });
    expect(result.current.epochMilliseconds).toBe(
      Temporal.Instant.from("2026-11-18T11:00:00+07:00").epochMilliseconds,
    );
  });

  it("catches up when a hidden tab becomes visible again", () => {
    const { result } = renderHook(() => useNow());
    // A background tab's timers can be throttled: the clock jumps without a tick.
    vi.setSystemTime(Temporal.Instant.from("2026-11-18T13:00:10+07:00"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.epochMilliseconds).toBe(
      Temporal.Instant.from("2026-11-18T13:00:00+07:00").epochMilliseconds,
    );
  });

  it("keeps the same Instant between renders within a minute", () => {
    const { result, rerender } = renderHook(() => useNow());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("shares one timer and keeps ticking while any caller remains", () => {
    const first = renderHook(() => useNow());
    const second = renderHook(() => useNow());
    expect(vi.getTimerCount()).toBe(1);
    first.unmount();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(second.result.current.epochMilliseconds).toBe(
      Temporal.Instant.from("2026-11-18T10:00:00+07:00").epochMilliseconds,
    );
    second.unmount();
  });

  it("stops ticking when nothing uses it", () => {
    const { unmount } = renderHook(() => useNow());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
