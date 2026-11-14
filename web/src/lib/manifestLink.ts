/** The web app manifest vite-plugin-pwa builds (see vite.config.ts). */
export const MANIFEST_HREF = "/manifest.webmanifest";

/**
 * Links the web app manifest. The page calls this once it has settled (whenPageSettled) instead
 * of putting the link in the document head: Chrome fetches the manifest, and an icon to check installability, as soon as the
 * link exists, and on a slow phone those requests delay the cover (Lighthouse, #43). Browsers read
 * a manifest added later just the same when the diner installs the app. Adding it twice is a no-op.
 */
export function addManifestLink(doc: Document = document): void {
  if (doc.head.querySelector('link[rel="manifest"]')) return;
  const link = doc.createElement("link");
  link.rel = "manifest";
  link.href = MANIFEST_HREF;
  doc.head.append(link);
}
