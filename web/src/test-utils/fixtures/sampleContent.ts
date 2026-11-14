/**
 * Thai sample data for tests and stories: gateway-like values (Tags, image descriptions),
 * caller-supplied prop values and layout stress copy. This is NOT UI copy: that lives in the
 * catalog `web/messages/th.json`, and tests assert it through the compiled `m.*()` functions
 * (`import { m } from "@/paraglide/messages.js"`). This folder is the only place in web/app and
 * web/src (besides the generated `src/paraglide/`) allowed to contain Thai characters.
 */

/** Tags as the gateway serves them. */
export const sampleTags = {
  cafe: "คาเฟ่",
  matcha: "มัทฉะ",
  hiddenGem: "ร้านลับ",
  travel: "เดินทาง",
  latin: "One Bangkok",
  long: "ร้านอาหารสำหรับกลุ่มใหญ่ที่จองล่วงหน้าได้",
} as const;

/** Image descriptions (alt text) as they would come from Guide and Restaurant data. */
export const sampleImageAlts = {
  hiddenCafe: "คาเฟ่ลับ",
  hiddenCafeInOneBangkok: "คาเฟ่ลับใน One Bangkok",
  cover: "ปก",
  noImage: "ไม่มีรูป",
  photo: "รูป",
} as const;

/** Stand-in page content for layout stories and tests. */
export const samplePageContent = {
  body: "เนื้อหาของหน้าแสดงตรงนี้",
} as const;

/**
 * Values a caller passes to override a component's default copy (e.g. `<NotFound title>`), so
 * tests and stories can tell an override from the default.
 */
export const sampleOverrides = {
  searchErrorTitle: "ค้นหาไม่สำเร็จ",
  searchErrorDescription: "ยังแสดงผลลัพธ์ก่อนหน้าอยู่",
  pageHeading: "ไกด์ทั้งหมด",
} as const;

/**
 * Caller-supplied EmptyState copy for stories and tests of the shared component (pages pass
 * their own `m.*()` copy; these stand in for the Guide Index search and filters to come).
 */
export const sampleEmptyState = {
  searchTitle: "ไม่พบไกด์ที่ตรงกับ “ราเมน”",
  searchDescription: "ลองใช้คำที่สั้นลง หรือเอาแท็ก #คาเฟ่ ออกเพื่อดูไกด์ทั้งหมด",
  clearSearch: "ล้างการค้นหา",
  filterMeta: "0 จาก 10 ร้าน",
  filterTitle: "ไม่มีร้านที่เปิดอยู่และรับเองที่ร้านได้",
  clearFilters: "ล้างตัวกรอง",
  shortTitle: "ไม่พบ",
  shortDescription: "ลองดูไกด์อื่น",
} as const;

/** Bits of Thai text for code that measures or encodes Thai (clamping, URLs). */
export const sampleThaiText = {
  short: "สั้น ๆ",
  /** One base consonant: takes width. */
  consonant: "ก",
  /** A consonant with a vowel above and a tone mark: still one character's width. */
  consonantWithMarks: "กิ่",
  /** A short write-up as an editor might write it. */
  writeUp: "RISE ลุกขึ้นแล้วดื่มกาแฟ !",
} as const;

/** Long Thai copy that checks wrapping in tight layouts. */
export const stressCopy = {
  guideTitle:
    "พาส่องพิกัดร้านดัง One Bangkok ทั้งคาเฟ่&ร้านอาหาร ที่สายกินอย่างเราต้องมาเช็กอินให้ได้สักครั้ง",
  errorTitle: "โหลดไกด์ไม่สำเร็จ เนื่องจากเซิร์ฟเวอร์ไม่ตอบสนองภายในเวลาที่กำหนด",
  errorDescription:
    "ระบบลองเชื่อมต่อใหม่ให้อัตโนมัติแล้ว 2 ครั้งแต่ยังไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ แล้วกดลองใหม่อีกครั้ง",
} as const;

/** Expected `formatDate` output, typed out so the formatter is checked against real Thai text. */
export const formattedDates = {
  /** 2024-03-10 in the Buddhist calendar. */
  march10th2024: "10 มี.ค. 2567",
} as const;
