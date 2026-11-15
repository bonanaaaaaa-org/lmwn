import { Temporal as PolyfillTemporal } from "temporal-polyfill/implementation";

import { isOpenNow } from "@/features/guides/lib/openNow";
import { formatDate, toIsoDate, wallClock } from "@/lib/format";
import { ensureTemporal } from "@/lib/temporal";
import { everyDay } from "@/test-utils/fixtures/guides";
import { formattedDates } from "@/test-utils/fixtures/sampleContent";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ensureTemporal", () => {
  it("installs the polyfill when the browser has no Temporal (Safari)", async () => {
    const native = globalThis.Temporal;
    vi.stubGlobal("Temporal", undefined);

    await ensureTemporal();

    expect(globalThis.Temporal).not.toBe(native);
    expect(
      globalThis.Temporal.Instant.from("2026-11-16T12:00:00+07:00").toString(),
    ).toBe("2026-11-16T05:00:00Z");
  });

  it("keeps the native Temporal when there is one", async () => {
    const native = globalThis.Temporal;

    await ensureTemporal();

    expect(globalThis.Temporal).toBe(native);
  });
});

describe("dates on the polyfill (Safari)", () => {
  beforeEach(() => {
    vi.stubGlobal("Temporal", PolyfillTemporal);
  });

  it("formats, dates and reads the wall clock as on native Temporal", () => {
    expect(formatDate("2024-03-09T20:00:00Z")).toBe(
      formattedDates.march10th2024,
    );
    expect(toIsoDate("2024-03-09T20:00:00Z")).toBe("2024-03-10");
    // Monday 23:30 UTC is already Tuesday 06:30 in Bangkok.
    expect(
      wallClock(PolyfillTemporal.Instant.from("2026-11-16T23:30:00Z")),
    ).toEqual({ day: 2, minutes: 390 });
  });

  it("judges Open Now", () => {
    const hours = everyDay(480, 1020);
    const at = (iso: string) =>
      isOpenNow(hours, PolyfillTemporal.Instant.from(iso), "Asia/Bangkok");

    expect(at("2026-11-16T12:00:00+07:00")).toBe(true);
    expect(at("2026-11-16T17:00:00+07:00")).toBe(false);
  });
});
