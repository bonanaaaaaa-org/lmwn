import type {
  Guide,
  GuideItem,
  Photo,
  Restaurant,
  WorkingDay,
} from "@/features/guides/lib/types";

/**
 * Gateway-shaped sample data for tests and stories, modelled on the provided Data Server's
 * One Bangkok Guide. Images are inline SVGs so nothing touches the network.
 */

const svgPhoto = (label: string, width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#d9c7b5"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(width / 10)}" text-anchor="middle" dominant-baseline="middle" fill="#1f1a15">${label}</text></svg>`,
  )}`;

export function makePhoto(n: number, overrides: Partial<Photo> = {}): Photo {
  return {
    id: `photo-${n}`,
    smallUrl: svgPhoto(`${n}`, 480, 600),
    largeUrl: svgPhoto(`${n}`, 1080, 1350),
    ...overrides,
  };
}

/** The same single range on all seven days. */
export const everyDay = (opensAt: number, closesAt: number): WorkingDay[] =>
  [1, 2, 3, 4, 5, 6, 7].map((day) => ({
    day,
    ranges: [{ opensAt, closesAt }],
  }));

export function makeRestaurant(
  overrides: Partial<Restaurant> = {},
): Restaurant {
  return {
    id: "cea893e7-1893-43ed-8890-f404395572d0",
    name: "ONIBUS COFFEE",
    branch: "One Bangkok",
    rating: 4.29,
    numberOfReviews: 6,
    url: "https://www.wongnai.com/restaurants/onibus-coffee-one-bangkok",
    address: "ชั้น 1 One Bangkok ลุมพินี ปทุมวัน กรุงเทพมหานคร",
    lat: 13.7275,
    lng: 100.5469,
    phoneNo: "0939164541",
    categories: ["ร้านกาแฟ/ชา", "เบเกอรี/เค้ก"],
    workingHours: everyDay(480, 1020),
    official: true,
    delivery: true,
    pickup: true,
    line: "@onibuscoffee",
    instagram: "onibuscoffee_bkk",
    facebook: "onibuscoffeebkk",
    ...overrides,
  };
}

export const LONG_WRITE_UP =
  'ร้านกาแฟสัญชาติญี่ปุ่น ที่คอกาแฟเทสต์ดีต้องห้ามพลาด! กับสาขาใหม่ล่าสุด! "One Bangkok" ที่ตกแต่งร้านโทนไม้ให้ฟีลอบอุ่น ผสานเข้ากับกระจกบานใหญ่โดยรอบและสีขาวได้อย่างลงตัว ซึ่งโดยรวมมีพื้นที่ทั้งหมด 2 ชั้นครึ่ง และมีเมล็ดกาแฟให้เลือกหลากหลาย ตามสไตล์ Taste Note ที่ชอบ จุดเด่นสุดจึ้งของสาขานี้คือ มีบาร์กาแฟทำเครื่องดื่มโชว์สดๆ ให้ดูกันเพลินๆ';

export function makeGuideItem(overrides: Partial<GuideItem> = {}): GuideItem {
  return {
    id: "c77c4d6c-01fa-4e62-8870-563de216a976",
    description: "ONI BUS ร้านสุดลับซ่อนตัวอยู่ที่ไหนก็ไม่รู้",
    photos: [makePhoto(1), makePhoto(2), makePhoto(3), makePhoto(4)],
    restaurant: makeRestaurant(),
    ...overrides,
  };
}

export const GUIDE_ID = "e1bfd2d3-f0fb-470e-bdd3-be884fdd8dfb";

export function makeGuide(overrides: Partial<Guide> = {}): Guide {
  return {
    id: GUIDE_ID,
    title: "10 คาเฟ่ลับ One Bangkok!",
    socialTitle: "ไม่อยากจะเชื่อ มีร้านคาเฟ่ดี ๆ แบบนี้ห้างดังย่านลุมพินี One Bangkok ด้วย",
    shortDescription: "รวมคาเฟ่เด็ดที่ One Bangkok",
    description:
      "รวมสุดยอดคาเฟ่ลับ ที่จะพาคุณไปหลงทาง เอ้ย! หลงไหล ในกลิ่นกาแฟอันหอมหวน และ บรรยากาศร้านติดแกรม กินแล้วจะติดใจ",
    coverPhoto: {
      id: "cover",
      smallUrl: svgPhoto("cover", 854, 480),
      largeUrl: svgPhoto("cover", 1920, 1080),
    },
    tags: ["กาแฟ", "คาเฟ่", "กรุงเทพ", "One", "Bangkok"],
    writeDate: "2024-03-10T12:00:00.000Z",
    timeZone: "Asia/Bangkok",
    items: [
      makeGuideItem(),
      makeGuideItem({
        id: "a213d622-6649-45b2-9857-ce7f81581256",
        description: "ไม่อยากจะเชื่อ KFC ขายกาแฟซะด้วย !",
        photos: [makePhoto(5)],
        restaurant: makeRestaurant({
          id: "07e48699-a280-4e8f-9b77-97b4201ab175",
          name: "KFC",
          branch: "One Bangkok",
          rating: 4,
          numberOfReviews: 2,
          categories: ["ฟาสต์ฟู้ด/จานด่วน"],
          phoneNo: "0655053058",
          pickup: false,
          line: undefined,
          instagram: undefined,
          facebook: undefined,
        }),
      }),
      makeGuideItem({
        id: "9e4ae89a-0000-4000-8000-000000000003",
        description: "RISE ลุกขึ้นแล้วดื่มกาแฟ !",
        photos: [makePhoto(6), makePhoto(7, { smallUrl: "", largeUrl: "" })],
        restaurant: null,
      }),
      makeGuideItem({
        id: "da79ad80-0000-4000-8000-000000000004",
        description: LONG_WRITE_UP,
        photos: [makePhoto(8), makePhoto(9), makePhoto(10)],
        restaurant: makeRestaurant({
          id: "5b8f4a8e-2c1d-4f0a-9a43-1f7f8d0c2b6e",
          name: "% Arabica",
          branch: undefined,
          rating: 0,
          numberOfReviews: 0,
          categories: ["ร้านกาแฟ/ชา"],
          official: false,
          delivery: false,
          pickup: false,
          line: undefined,
          facebook: undefined,
        }),
      }),
    ],
    ...overrides,
  };
}

/** The guide as JSON from the gateway: optional fields that are `undefined` are left out. */
export function toGatewayJson(guide: Guide): Record<string, unknown> {
  return JSON.parse(JSON.stringify(guide));
}
