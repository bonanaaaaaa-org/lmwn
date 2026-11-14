import { http, HttpResponse } from "msw";

import { ApiError, InvalidResponseError } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { server } from "@/test-utils/server";

import {
  GUIDE_ID,
  makeGuide,
  toGatewayJson,
} from "@/test-utils/fixtures/guides";
import { guidesApi } from "./guidesApi";

describe("guidesApi.get", () => {
  it("returns the Guide with its Guide Items in order", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/guides/${GUIDE_ID}`, () =>
        HttpResponse.json(toGatewayJson(makeGuide())),
      ),
    );

    const guide = await guidesApi.get(GUIDE_ID);

    expect(guide.title).toBe(makeGuide().title);
    expect(guide.items.map((item) => item.restaurant?.name ?? null)).toEqual([
      "ONIBUS COFFEE",
      "KFC",
      null,
      "% Arabica",
    ]);
    expect(guide.items[3]?.restaurant?.branch).toBeUndefined();
  });

  it("encodes the id so a path like ../ stays one segment", async () => {
    let requested = "";
    server.use(
      http.get(`${env.apiBaseUrl}/guides/:id`, ({ request }) => {
        requested = new URL(request.url).pathname;
        return HttpResponse.json(
          { detail: "Guide not found" },
          { status: 404 },
        );
      }),
    );

    await expect(guidesApi.get("../health?x=1")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(requested).toBe("/guides/..%2Fhealth%3Fx%3D1");
  });

  it("rejects a body that breaks the contract", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/guides/${GUIDE_ID}`, () =>
        HttpResponse.json({ ...makeGuide(), items: [{ id: 1 }] }),
      ),
    );

    await expect(guidesApi.get(GUIDE_ID)).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });
});
