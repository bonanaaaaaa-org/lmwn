import type { ImageSource } from "@/components/common/ResponsiveImage";

import type { Photo } from "./types";

// The image server's URLs carry the rendered size: /r/{width}/{height}/{file}.
const SIZE_IN_URL = /\/r\/(\d+)\/\d+\//;
const FALLBACK_WIDTH = { small: 480, large: 1080 } as const;

function widthOf(url: string, fallback: number): number {
  const match = SIZE_IN_URL.exec(url);
  return match?.[1] ? Number(match[1]) : fallback;
}

/** A gateway Photo as `srcset` candidates: its small and large URLs with their widths. */
export function photoSources(photo: Photo): ImageSource[] {
  return [
    {
      url: photo.smallUrl,
      width: widthOf(photo.smallUrl, FALLBACK_WIDTH.small),
    },
    {
      url: photo.largeUrl,
      width: widthOf(photo.largeUrl, FALLBACK_WIDTH.large),
    },
  ];
}
