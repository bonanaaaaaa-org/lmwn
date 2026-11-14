import type { ImageSource } from "@/components/common/ResponsiveImage";

/** An inline SVG data URL: keeps stories off the network and off the image server. */
export function storyImage(width: number, height: number, label: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#d9c7b5"/><text x="50%" y="50%" font-family="sans-serif" font-size="${width / 12}" text-anchor="middle" dominant-baseline="middle" fill="#1f1a15">${label}</text></svg>`,
  )}`;
}

/** Small and large cover candidates for stories. */
export function storyCover(label: string): ImageSource[] {
  return [
    { url: storyImage(854, 534, label), width: 854 },
    { url: storyImage(1920, 1200, label), width: 1920 },
  ];
}
