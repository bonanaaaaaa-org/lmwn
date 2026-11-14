import {
  guideIndexSearches as q,
  guideIndexTags as t,
} from "@/test-utils/fixtures/guideIndex";

import { guideIndexKeys } from "./queryKeys";

describe("guideIndexKeys", () => {
  it("keys a list by its search text and Tags", () => {
    expect(guideIndexKeys.list({ q: q.cafe, tags: [t.coffee] })).toEqual([
      "guides",
      "list",
      { q: q.cafe, tags: [t.coffee] },
    ]);
  });

  it("gives the same key to searches the gateway treats the same", () => {
    expect(guideIndexKeys.list({ q: "  ", tags: [] })).toEqual(
      guideIndexKeys.list({ q: "", tags: [] }),
    );
    expect(guideIndexKeys.list({ q: ` ${q.cafe}`, tags: ["a", "a"] })).toEqual(
      guideIndexKeys.list({ q: q.cafe, tags: ["a"] }),
    );
  });

  it("nests every list under the Guide lists key", () => {
    expect(guideIndexKeys.list({ q: "", tags: [] }).slice(0, 2)).toEqual(
      guideIndexKeys.lists(),
    );
  });
});
