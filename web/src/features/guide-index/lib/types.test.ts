import { guideListSchema } from "./types";
import { guideList } from "./fixtures";

describe("guideListSchema", () => {
  it("accepts the gateway's Guide Index response", () => {
    expect(guideListSchema.parse(guideList).items).toHaveLength(2);
  });

  it("rejects a Guide without a cover photo", () => {
    const [first] = guideList.items;
    const { coverPhoto: _, ...withoutCover } = first!;

    expect(
      guideListSchema.safeParse({ items: [withoutCover], total: 1 }).success,
    ).toBe(false);
  });
});
