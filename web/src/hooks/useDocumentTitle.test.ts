import { renderHook } from "@testing-library/react";

import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  it("sets the tab title and restores the previous one on unmount", () => {
    document.title = "Guide to Hidden Gems";
    const { rerender, unmount } = renderHook(
      ({ title }) => useDocumentTitle(title),
      {
        initialProps: { title: undefined as string | undefined },
      },
    );
    expect(document.title).toBe("Guide to Hidden Gems");

    rerender({ title: "ไม่อยากจะเชื่อ" });
    expect(document.title).toBe("ไม่อยากจะเชื่อ");

    unmount();
    expect(document.title).toBe("Guide to Hidden Gems");
  });
});
