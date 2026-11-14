import { addManifestLink, MANIFEST_HREF } from "@/lib/manifestLink";

describe("addManifestLink", () => {
  afterEach(() => {
    for (const link of document.head.querySelectorAll('link[rel="manifest"]')) {
      link.remove();
    }
  });

  it("links the web app manifest once, however often it is called", () => {
    addManifestLink();
    addManifestLink();

    const links = document.head.querySelectorAll('link[rel="manifest"]');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", MANIFEST_HREF);
  });
});
