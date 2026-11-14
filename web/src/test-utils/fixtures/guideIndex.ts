import type { ImageSource } from "@/components/common/ResponsiveImage";
import type { GuideList, GuideSummary } from "@/features/guide-index/lib/types";

/**
 * Guide Index sample data for tests and stories: the two sample Guides from the Data Server as
 * `GET /guides` returns them, the Tags and search text the specs use, and inline SVG covers so
 * stories stay off the network and the image server.
 */

/** Tags as the sample Guides carry them. */
export const guideIndexTags = {
  coffee: "กาแฟ",
  cafe: "คาเฟ่",
  restaurant: "ร้านอาหาร",
  bangkok: "กรุงเทพ",
  one: "One",
  bangkokLatin: "Bangkok",
} as const;

/** Search text the Guide Index specs type. */
export const guideIndexSearches = {
  /** Matches both sample Guides. */
  cafe: "คาเฟ่",
  /** The first characters of `cafe`. */
  cafePrefix: "คา",
  /** Matches the café Guide's title only. */
  hiddenCafe: "คาเฟ่ลับ",
  /** Matches the restaurant Guide only. */
  restaurant: "ร้านอาหาร",
  /** Matches no Guide. */
  ramen: "ราเมน",
} as const;

export const cafeGuide: GuideSummary = {
  id: "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb",
  title: "10 คาเฟ่ลับ One Bangkok!",
  shortDescription: "รวมคาเฟ่เด็ดที่ One Bangkok",
  coverPhoto: {
    id: "63ce2123-b49a-49cc-bc13-80ed802a7894",
    smallUrl: "http://localhost:7777/r/854/480/20240902_091058.jpg",
    largeUrl: "http://localhost:7777/r/1920/1080/20240902_091058.jpg",
  },
  tags: [
    guideIndexTags.coffee,
    guideIndexTags.cafe,
    guideIndexTags.bangkok,
    guideIndexTags.one,
    guideIndexTags.bangkokLatin,
  ],
  itemCount: 10,
};

export const restaurantGuide: GuideSummary = {
  id: "34c790dd-123b-499b-ba55-ea2f5befb452",
  title: "พาส่องพิกัดร้านดัง One Bangkok ทั้งคาเฟ่&ร้านอาหาร",
  shortDescription:
    "One Bangkok แหล่งรวมคาเฟ่ชิค ๆ และร้านอาหารสุดปัง ที่สายกินต้องมา! 🍽️✨ ตั้งแต่กาแฟหอมกรุ่น ครัวซองต์อบใหม่ อาหารไทยรสจัด ไปจนถึงไฟน์ไดนิ่งสุดหรู 🌆 อร่อยจนลืมคุมแคล~ ถ่ายรูปมุมไหนก็ปัง 📸💕 ระวังอย่างเดียว… กระเป๋าแฟบเพราะหยุดสั่งไม่ได้! 🤣💸",
  coverPhoto: {
    id: "55c4f986-7a9a-447f-8189-b2da1c8bed18",
    smallUrl:
      "http://localhost:7777/r/854/480/461096059_912589204236633_7378604821400958462_n.jpg",
    largeUrl:
      "http://localhost:7777/r/1920/1080/461096059_912589204236633_7378604821400958462_n.jpg",
  },
  tags: [
    guideIndexTags.coffee,
    guideIndexTags.cafe,
    guideIndexTags.restaurant,
    guideIndexTags.bangkok,
    guideIndexTags.one,
    guideIndexTags.bangkokLatin,
  ],
  itemCount: 3,
};

export const guideList: GuideList = {
  items: [cafeGuide, restaurantGuide],
  total: 2,
};

export const listOf = (...items: GuideSummary[]): GuideList => ({
  items,
  total: items.length,
});

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
