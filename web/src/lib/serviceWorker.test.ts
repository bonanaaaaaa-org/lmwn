import { loadedGatewayUrls } from "@/lib/serviceWorker";

describe("loadedGatewayUrls", () => {
  const api = "https://api-hidden-gems.bonanaaaaaa.dev";

  it("keeps the gateway's requests once each, and nothing else", () => {
    const entries = [
      { name: `${api}/guides` },
      { name: `${api}/photos/r/480/320/a.jpg` },
      { name: `${api}/guides` },
      { name: "https://hidden-gems.bonanaaaaaa.dev/assets/root.js" },
      { name: "https://api-hidden-gems.bonanaaaaaa.dev.evil.example/guides" },
      { name: "http://localhost:7777/r/480/320/a.jpg" },
    ];

    expect(loadedGatewayUrls(entries, api)).toEqual([
      `${api}/guides`,
      `${api}/photos/r/480/320/a.jpg`,
    ]);
  });
});
