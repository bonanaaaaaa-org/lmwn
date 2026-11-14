import type { GuideList, GuideSummary } from "./types";

/**
 * The two sample Guides from the Data Server, as `GET /guides` returns them. For tests and
 * stories only (stories swap the image URLs for inline SVGs so they stay off the network).
 */
export const cafeGuide: GuideSummary = {
  id: "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb",
  title: "10 คาเฟ่ลับ One Bangkok!",
  shortDescription: "รวมคาเฟ่เด็ดที่ One Bangkok",
  coverPhoto: {
    id: "63ce2123-b49a-49cc-bc13-80ed802a7894",
    smallUrl: "http://localhost:7777/r/854/480/20240902_091058.jpg",
    largeUrl: "http://localhost:7777/r/1920/1080/20240902_091058.jpg",
  },
  tags: ["กาแฟ", "คาเฟ่", "กรุงเทพ", "One", "Bangkok"],
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
  tags: ["กาแฟ", "คาเฟ่", "ร้านอาหาร", "กรุงเทพ", "One", "Bangkok"],
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
