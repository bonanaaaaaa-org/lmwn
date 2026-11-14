import { http, HttpResponse } from "msw";
import { z } from "zod";

import { ApiError, fetchJson } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { createQueryClient, shouldRetry } from "@/lib/queryClient";
import { server } from "@/test-utils/server";

describe("shouldRetry", () => {
  it("never retries client errors", () => {
    expect(shouldRetry(0, new ApiError(404, "Guide not found"))).toBe(false);
    expect(shouldRetry(0, new ApiError(422, undefined))).toBe(false);
  });

  it("retries server and network errors up to twice", () => {
    const serverError = new ApiError(503, undefined);
    expect(shouldRetry(0, serverError)).toBe(true);
    expect(shouldRetry(1, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(2, serverError)).toBe(false);
  });

  it("never retries while the browser is offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(false);
    expect(shouldRetry(0, new ApiError(503, undefined))).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("createQueryClient", () => {
  it("applies the app's query defaults", () => {
    const queries = createQueryClient().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.retry).toBe(shouldRetry);
    expect(queries?.networkMode).toBe("always");
  });
});

describe("retry policy against the gateway", () => {
  const schema = z.object({ ok: z.boolean() });

  // The app's real client; only the delay between attempts is shortened so the test is fast.
  async function requestCountFor(status: number): Promise<number> {
    let requests = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/retry-probe`, () => {
        requests += 1;
        return HttpResponse.json({ detail: "boom" }, { status });
      }),
    );
    const queryClient = createQueryClient();

    await expect(
      queryClient.fetchQuery({
        queryKey: ["retry-probe", status],
        queryFn: () => fetchJson("/retry-probe", schema),
        retry: queryClient.getDefaultOptions().queries?.retry,
        retryDelay: 0,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    return requests;
  }

  it.each([500, 502, 503, 504])(
    "retries a %i twice (3 attempts)",
    async (status) => {
      expect(await requestCountFor(status)).toBe(3);
    },
  );

  it("never retries a 404", async () => {
    expect(await requestCountFor(404)).toBe(1);
  });

  it("retries a network failure twice", async () => {
    let requests = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/retry-probe`, () => {
        requests += 1;
        return HttpResponse.error();
      }),
    );
    const queryClient = createQueryClient();

    await expect(
      queryClient.fetchQuery({
        queryKey: ["retry-probe", "network"],
        queryFn: () => fetchJson("/retry-probe", schema),
        retry: queryClient.getDefaultOptions().queries?.retry,
        retryDelay: 0,
      }),
    ).rejects.toThrow();
    expect(requests).toBe(3);
  });
});
