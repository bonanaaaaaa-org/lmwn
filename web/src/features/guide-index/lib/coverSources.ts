import type { ImageSource } from "@/components/common/ResponsiveImage";

import type { Photo } from "./types";

const FALLBACK_SMALL_WIDTH = 480;
const FALLBACK_LARGE_WIDTH = 1080;

/** The image server resizes through `/r/{width}/{height}/{file}`. */
const SIZED_PATH = /\/r\/(\d+)\/\d+\//;

function widthOf(url: string, fallback: number): number {
  const match = SIZED_PATH.exec(url);
  return match?.[1] ? Number(match[1]) : fallback;
}

/** `srcset` candidates for a cover photo: the small and large URLs with their widths. */
export function coverSources(photo: Photo): ImageSource[] {
  return [
    {
      url: photo.smallUrl,
      width: widthOf(photo.smallUrl, FALLBACK_SMALL_WIDTH),
    },
    {
      url: photo.largeUrl,
      width: widthOf(photo.largeUrl, FALLBACK_LARGE_WIDTH),
    },
  ];
}
