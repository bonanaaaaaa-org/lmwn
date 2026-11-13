import { ApiError } from "@/lib/apiClient";
import { createQueryClient, shouldRetry } from "@/lib/queryClient";

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
});

describe("createQueryClient", () => {
  it("applies the app's query defaults", () => {
    const queries = createQueryClient().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.retry).toBe(shouldRetry);
  });
});
