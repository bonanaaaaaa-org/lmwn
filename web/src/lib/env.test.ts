import { resolveApiBaseUrl } from "@/lib/env";

describe("resolveApiBaseUrl", () => {
  it("falls back to the local gateway when unset or blank", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("http://localhost:4000");
    expect(resolveApiBaseUrl("  ")).toBe("http://localhost:4000");
  });

  it("strips trailing slashes", () => {
    expect(resolveApiBaseUrl("https://api.example.com//")).toBe(
      "https://api.example.com",
    );
  });
});
