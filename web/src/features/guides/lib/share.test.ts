import { makeGuide, makeGuideItem, makeRestaurant } from "./fixtures";
import {
  guideItemIdFromHash,
  guideItemShareTarget,
  guideShareTarget,
  itemAnchorId,
} from "./share";

describe("guideShareTarget", () => {
  it("shares the Guide link with its socialTitle as the text", () => {
    const guide = makeGuide();

    expect(guideShareTarget(guide)).toEqual({
      title: "10 คาเฟ่ลับ One Bangkok!",
      text: guide.socialTitle,
      url: `/guides/${guide.id}`,
      copiedMessage: "คัดลอกลิงก์แล้ว",
    });
  });
});

describe("guideItemShareTarget", () => {
  it("names the Restaurant and the Guide, and links to the card", () => {
    const guide = makeGuide();
    const item = makeGuideItem();

    expect(guideItemShareTarget(guide, item)).toEqual({
      title: "ONIBUS COFFEE (สาขา One Bangkok)",
      text: "ร้าน ONIBUS COFFEE (สาขา One Bangkok) จากไกด์ 10 คาเฟ่ลับ One Bangkok!",
      url: `/guides/${guide.id}#item-${item.id}`,
      copiedMessage: "คัดลอกลิงก์ร้าน ONIBUS COFFEE แล้ว",
    });
  });

  it("leaves out the branch when there is none", () => {
    const target = guideItemShareTarget(
      makeGuide(),
      makeGuideItem({ restaurant: makeRestaurant({ branch: undefined }) }),
    );

    expect(target?.title).toBe("ONIBUS COFFEE");
  });

  it("has nothing to share for an Unavailable Restaurant", () => {
    expect(
      guideItemShareTarget(makeGuide(), makeGuideItem({ restaurant: null })),
    ).toBeUndefined();
  });
});

describe("guideItemIdFromHash", () => {
  it("reads the Guide Item ID from #item-{id}", () => {
    expect(guideItemIdFromHash(`#${itemAnchorId("abc-123")}`)).toBe("abc-123");
  });

  it.each(["", "#", "#item-", "#main-content", "item-abc", "#item-%E0%A4%A"])(
    "ignores %j",
    (hash) => {
      expect(guideItemIdFromHash(hash)).toBeUndefined();
    },
  );
});
