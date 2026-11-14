import type { ImageSource } from "@/components/common/ResponsiveImage";

import { m } from "@/paraglide/messages.js";

import type { Photo } from "./types";

// The image server's URLs carry the rendered size: /r/{width}/{height}/{file}.
const SIZE_IN_URL = /\/r\/(\d+)\/(\d+)\//;
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

/** The image server renders Guide Item photos as 9:16 portraits. */
const FALLBACK_PHOTO_RATIO = 9 / 16;

/** A photo's width-to-height ratio, read from its image server URL: /r/1080/1920/… → 0.5625. */
export function photoRatio(url: string): number {
  const match = SIZE_IN_URL.exec(url);
  const width = Number(match?.[1]);
  const height = Number(match?.[2]);
  return width > 0 && height > 0 ? width / height : FALLBACK_PHOTO_RATIO;
}

/**
 * Photo `position` (from 1) of `total`, named by the Restaurant when it is known. The strip
 * and the lightbox share it, so a photo reads the same in both.
 */
export function photoAlt(position: number, total: number, restaurant?: string) {
  return restaurant
    ? m.restaurantCard_photoStrip_photo_alt({ position, total, restaurant })
    : m.restaurantCard_photoStrip_photo_unnamedAlt({ position, total });
}
