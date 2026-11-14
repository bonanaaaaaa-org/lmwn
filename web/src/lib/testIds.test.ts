import { joinTestId } from "@/lib/testIds";

describe("joinTestId", () => {
  it("joins a parent ID and a segment with a slash", () => {
    expect(joinTestId("guide", "restaurant-card")).toBe(
      "guide/restaurant-card",
    );
    expect(joinTestId("guide/restaurant-card/photo-strip", "next")).toBe(
      "guide/restaurant-card/photo-strip/next",
    );
  });

  it("uses the segment alone when there is no parent", () => {
    expect(joinTestId(undefined, "restaurant-card")).toBe("restaurant-card");
    expect(joinTestId("", "restaurant-card")).toBe("restaurant-card");
  });

  it("rejects segments that are not kebab-case", () => {
    expect(() => joinTestId("guide", "restaurantCard")).toThrow(/kebab-case/);
    expect(() => joinTestId("guide", "a/b")).toThrow(/kebab-case/);
  });
});
