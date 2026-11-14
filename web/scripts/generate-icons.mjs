/**
 * Renders the PWA icons (#43) from the app's own mark (public/favicon.svg: a saffron tile with an
 * ink gem) into public/icons/, with Playwright's Chromium, so no image tool is needed:
 *
 * - icon-192.png, icon-512.png: the favicon tile as is (rounded corners, transparent outside).
 * - icon-maskable-512.png: full-bleed saffron with the gem inside the central 80 % safe zone, so
 *   Android's circle, squircle or square masks never cut it.
 * - apple-touch-icon.png (180): full-bleed and square; iOS rounds the corners itself.
 *
 * Usage (from web/): node scripts/generate-icons.mjs   — then commit public/icons/.
 */
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(WEB_ROOT, "public/icons");

const SAFFRON = "#f2b705";
const INK = "#111";
/** The gem from favicon.svg, drawn on a 32 × 32 grid. */
const GEM = `<path fill="${INK}" d="M10.5 8h11l4.5 6-10 11L6 14Z"/><path fill="${SAFFRON}" d="M12 10.5h8l1.9 3.5H10.1Z"/>`;

/** `scale` shrinks the gem about the centre (1 = as in the favicon). */
const svg = ({ rounded, scale }) => {
  const offset = (32 - 32 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%"><rect width="32" height="32" rx="${rounded ? 8 : 0}" fill="${SAFFRON}"/><g transform="translate(${offset} ${offset}) scale(${scale})">${GEM}</g></svg>`;
};

const ICONS = [
  { file: "icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "icon-512.png", size: 512, rounded: true, scale: 1 },
  // The gem spans about 20 of 32 units; at 0.75 it sits well inside the 80 % safe circle.
  { file: "icon-maskable-512.png", size: 512, rounded: false, scale: 0.75 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, scale: 0.85 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
    });
    await page.setContent(
      `<html><body style="margin:0">${svg(icon)}</body></html>`,
    );
    await page.screenshot({
      path: join(OUT, icon.file),
      omitBackground: true,
    });
    await page.close();
    process.stdout.write(`public/icons/${icon.file}\n`);
  }
} finally {
  await browser.close();
}
