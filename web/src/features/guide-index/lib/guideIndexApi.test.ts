import { http, HttpResponse } from "msw";

import { env } from "@/lib/env";
import { server } from "@/test-utils/server";

import { guideList } from "./fixtures";
import { guideIndexApi } from "./guideIndexApi";

function captureRequests() {
  const urls: URL[] = [];
  server.use(
    http.get(`${env.apiBaseUrl}/guides`, ({ request }) => {
      urls.push(new URL(request.url));
      return HttpResponse.json(guideList);
    }),
  );
  return urls;
}

describe("guideIndexApi.list", () => {
  it("returns the parsed Guide Index", async () => {
    captureRequests();

    await expect(guideIndexApi.list({ q: "", tags: [] })).resolves.toEqual(
      guideList,
    );
  });

  it("sends q and one tag parameter per Tag", async () => {
    const urls = captureRequests();

    await guideIndexApi.list({ q: " คาเฟ่ ", tags: ["กาแฟ", "One Bangkok"] });

    expect(urls[0]?.searchParams.get("q")).toBe("คาเฟ่");
    expect(urls[0]?.searchParams.getAll("tag")).toEqual([
      "กาแฟ",
      "One Bangkok",
    ]);
  });

  it("omits empty or whitespace-only search text", async () => {
    const urls = captureRequests();

    await guideIndexApi.list({ q: "   ", tags: [] });

    expect(urls[0]?.search).toBe("");
  });
});
