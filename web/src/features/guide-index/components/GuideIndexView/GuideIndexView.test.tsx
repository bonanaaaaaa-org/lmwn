import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";
import {
  guideIndexSearches as q,
  guideIndexTags as t,
  guideList,
} from "@/test-utils/fixtures/guideIndex";

import { GuideIndexView, type GuideIndexViewProps } from "./GuideIndexView";

function renderView(props: Partial<GuideIndexViewProps> = {}) {
  render(
    <GuideIndexView
      filters={{ q: "", tags: [] }}
      results={{
        status: "ready",
        guides: guideList.items,
        total: 2,
        isUpdating: false,
      }}
      tags={[t.coffee, t.restaurant]}
      searchText=""
      isSearchTooLong={false}
      onSearchTextChange={vi.fn()}
      onSearchSubmit={vi.fn()}
      onSearchClear={vi.fn()}
      onTagsChange={vi.fn()}
      onClearAll={vi.fn()}
      {...props}
    />,
  );
}

describe("GuideIndexView", () => {
  it("offers clear all only when a search or Tag is applied", () => {
    renderView();
    expect(
      screen.queryByRole("button", { name: m.guideIndex_clearAll_label() }),
    ).not.toBeInTheDocument();
  });

  it("shows clear all with a Tag applied", () => {
    renderView({ filters: { q: "", tags: [t.coffee] } });
    expect(screen.getByTestId("guide-index/clear-all")).toHaveTextContent(
      m.guideIndex_clearAll_label(),
    );
  });

  it("links card Tags to the Guide Index with the Tag added to the current filters", () => {
    renderView({ filters: { q: q.cafe, tags: [t.coffee] } });

    const [link] = screen.getAllByRole("link", { name: t.bangkok });
    const url = new URL(link!.getAttribute("href")!, "http://localhost");
    expect(url.searchParams.get("q")).toBe(q.cafe);
    expect(url.searchParams.getAll("tag")).toEqual([t.coffee, t.bangkok]);
  });

  it("uses the phone card layout on phones", () => {
    renderView({ layout: "phone" });
    for (const card of screen.getAllByTestId("guide-index/guide-card")) {
      expect(card).toHaveAttribute("data-layout", "phone");
    }
  });

  it("explains when there are no Guides at all, without a clear action", () => {
    renderView({
      results: { status: "ready", guides: [], total: 0, isUpdating: false },
    });
    expect(
      screen.getByRole("heading", { name: m.guideIndex_emptyState_title() }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: m.guideIndex_emptyState_action_label(),
      }),
    ).not.toBeInTheDocument();
  });
});
