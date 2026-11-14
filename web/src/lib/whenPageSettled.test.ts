import { whenPageSettled } from "@/lib/whenPageSettled";

type Observe = (list: { getEntries: () => object[] }) => void;

/** A PerformanceObserver that reports LCP and lets the test deliver entries. */
function fakeLcpObserver() {
  const callbacks: Observe[] = [];
  const disconnect = vi.fn();
  class FakeObserver {
    static supportedEntryTypes = ["largest-contentful-paint"];
    constructor(callback: Observe) {
      callbacks.push(callback);
    }
    observe() {}
    disconnect = disconnect;
  }
  vi.stubGlobal("PerformanceObserver", FakeObserver);
  return {
    report: (entries: object[]) => {
      for (const callback of callbacks) callback({ getEntries: () => entries });
    },
    disconnect,
  };
}

describe("whenPageSettled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for an image's Largest Contentful Paint, then an idle moment", async () => {
    const lcp = fakeLcpObserver();
    let settled = false;
    void whenPageSettled().then(() => {
      settled = true;
    });

    lcp.report([{ url: "" }]); // a text LCP doesn't count
    await vi.advanceTimersByTimeAsync(1000);
    expect(settled).toBe(false);

    lcp.report([{ url: "https://api.example/photos/r/854/480/a.jpg" }]);
    await vi.advanceTimersByTimeAsync(500);
    expect(settled).toBe(true);
    expect(lcp.disconnect).toHaveBeenCalled();
  });

  it("gives up waiting for the image after 3 seconds", async () => {
    fakeLcpObserver();
    let settled = false;
    void whenPageSettled().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(3000 + 500);
    expect(settled).toBe(true);
  });

  it("doesn't wait for LCP where the browser doesn't report it", async () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    let settled = false;
    void whenPageSettled().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(settled).toBe(true);
  });
});
