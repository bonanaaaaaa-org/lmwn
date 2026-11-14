import {
  isGatewayGuidesRequest,
  isGatewayPhotoRequest,
  isShellNavigation,
} from "@/lib/swRoutes";

const API = "https://api-hidden-gems.bonanaaaaaa.dev";
const GUIDE_ID = "c4e9e1c2-58a4-4b3e-9a1d-0a6f3b1f2e10";
const url = (href: string) => new URL(href);

describe("isGatewayGuidesRequest", () => {
  it("matches the Guide Index, with or without a search, and a Guide", () => {
    for (const href of [
      `${API}/guides`,
      `${API}/guides?q=coffee&tag=cafe`,
      `${API}/guides/${GUIDE_ID}`,
    ]) {
      expect(isGatewayGuidesRequest("GET", url(href), API)).toBe(true);
    }
  });

  it("leaves other gateway routes, other methods and other origins alone", () => {
    expect(isGatewayGuidesRequest("GET", url(`${API}/health`), API)).toBe(
      false,
    );
    expect(
      isGatewayGuidesRequest("GET", url(`${API}/guides/a/items`), API),
    ).toBe(false);
    expect(isGatewayGuidesRequest("POST", url(`${API}/guides`), API)).toBe(
      false,
    );
    expect(
      isGatewayGuidesRequest("GET", url("https://evil.example/guides"), API),
    ).toBe(false);
    expect(
      isGatewayGuidesRequest("GET", url("http://localhost:8888/guides"), API),
    ).toBe(false);
  });

  it("honours a gateway mounted under a path", () => {
    const base = "https://example.com/api";
    expect(isGatewayGuidesRequest("GET", url(`${base}/guides`), base)).toBe(
      true,
    );
    expect(
      isGatewayGuidesRequest("GET", url("https://example.com/guides"), base),
    ).toBe(false);
  });
});

describe("isGatewayPhotoRequest", () => {
  it("matches the gateway's photos only", () => {
    expect(
      isGatewayPhotoRequest("GET", url(`${API}/photos/r/480/320/a.jpg`), API),
    ).toBe(true);
    expect(
      isGatewayPhotoRequest(
        "GET",
        url("http://localhost:7777/r/480/320/a.jpg"),
        API,
      ),
    ).toBe(false);
    expect(
      isGatewayPhotoRequest(
        "GET",
        url("https://cdn.example/photos/a.jpg"),
        API,
      ),
    ).toBe(false);
  });
});

describe("isShellNavigation", () => {
  const origin = "https://hidden-gems.bonanaaaaaa.dev";

  it("answers every route of the app", () => {
    for (const path of ["/", `/guides/${GUIDE_ID}`, "/no-such-page"]) {
      expect(isShellNavigation("navigate", url(origin + path), origin)).toBe(
        true,
      );
    }
  });

  it("leaves files, assets, other origins and non-navigations to the network", () => {
    expect(
      isShellNavigation("navigate", url(`${origin}/robots.txt`), origin),
    ).toBe(false);
    expect(
      isShellNavigation("navigate", url(`${origin}/assets/x.js`), origin),
    ).toBe(false);
    expect(
      isShellNavigation("navigate", url("https://other.example/"), origin),
    ).toBe(false);
    expect(isShellNavigation("cors", url(`${origin}/`), origin)).toBe(false);
  });
});
