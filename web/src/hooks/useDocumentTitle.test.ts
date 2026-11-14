import { renderHook } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";
import { makeGuide } from "@/test-utils/fixtures/guides";

import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  it("sets the tab title and restores the previous one on unmount", () => {
    document.title = m.app_title();
    const { rerender, unmount } = renderHook(
      ({ title }) => useDocumentTitle(title),
      {
        initialProps: { title: undefined as string | undefined },
      },
    );
    expect(document.title).toBe(m.app_title());

    const { socialTitle } = makeGuide();
    rerender({ title: socialTitle });
    expect(document.title).toBe(socialTitle);

    unmount();
    expect(document.title).toBe(m.app_title());
  });
});
