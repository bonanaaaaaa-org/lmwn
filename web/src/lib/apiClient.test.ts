import { http, HttpResponse } from "msw";
import { z } from "zod";

import { ApiError, fetchJson, InvalidResponseError } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { server } from "@/test-utils/server";

const guideSchema = z.object({ id: z.string(), title: z.string() });
const url = `${env.apiBaseUrl}/api/guides/g1`;

describe("fetchJson", () => {
  it("returns the parsed body when it matches the schema", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({ id: "g1", title: "Cafes", extra: 1 }),
      ),
    );

    await expect(fetchJson("/api/guides/g1", guideSchema)).resolves.toEqual({
      id: "g1",
      title: "Cafes",
    });
  });

  it("asks the gateway for JSON", async () => {
    let accept: string | null = null;
    server.use(
      http.get(url, ({ request }) => {
        accept = request.headers.get("accept");
        return HttpResponse.json({ id: "g1", title: "Cafes" });
      }),
    );

    await fetchJson("/api/guides/g1", guideSchema);

    expect(accept).toBe("application/json");
  });

  it("throws ApiError with the gateway's detail for non-2xx responses", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({ detail: "Guide not found" }, { status: 404 }),
      ),
    );

    const error = await fetchJson("/api/guides/g1", guideSchema).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      detail: "Guide not found",
      message: "Guide not found",
    });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    server.use(
      http.get(url, () => new HttpResponse("upstream down", { status: 503 })),
    );

    const error = await fetchJson("/api/guides/g1", guideSchema).catch(
      (e: unknown) => e,
    );

    expect(error).toMatchObject({ status: 503, detail: undefined });
    expect((error as Error).message).toBe("Request failed with status 503");
  });

  it("ignores a non-string detail", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({ detail: [{ loc: ["id"] }] }, { status: 422 }),
      ),
    );

    const error = await fetchJson("/api/guides/g1", guideSchema).catch(
      (e: unknown) => e,
    );

    expect(error).toMatchObject({ status: 422, detail: undefined });
  });

  it("throws InvalidResponseError when the body doesn't match the schema", async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: "g1" })));

    const error = await fetchJson("/api/guides/g1", guideSchema).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(InvalidResponseError);
    expect((error as InvalidResponseError).issues[0]?.path).toEqual(["title"]);
  });
});
