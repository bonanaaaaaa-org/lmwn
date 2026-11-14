import { render, screen } from "@testing-library/react";

import { guideList } from "@/features/guide-index/lib/fixtures";

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
      tags={["กาแฟ", "ร้านอาหาร"]}
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
  it("offers ล้างทั้งหมด only when a search or Tag is applied", () => {
    renderView();
    expect(
      screen.queryByRole("button", { name: "ล้างทั้งหมด" }),
    ).not.toBeInTheDocument();
  });

  it("shows ล้างทั้งหมด with a Tag applied", () => {
    renderView({ filters: { q: "", tags: ["กาแฟ"] } });
    expect(screen.getByTestId("guide-index/clear-all")).toHaveTextContent(
      "ล้างทั้งหมด",
    );
  });

  it("links card Tags to the Guide Index with the Tag added to the current filters", () => {
    renderView({ filters: { q: "คาเฟ่", tags: ["กาแฟ"] } });

    const [link] = screen.getAllByRole("link", { name: "กรุงเทพ" });
    const url = new URL(link!.getAttribute("href")!, "http://localhost");
    expect(url.searchParams.get("q")).toBe("คาเฟ่");
    expect(url.searchParams.getAll("tag")).toEqual(["กาแฟ", "กรุงเทพ"]);
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
      screen.getByRole("heading", { name: "ยังไม่มีไกด์" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "ล้างการค้นหา" }),
    ).not.toBeInTheDocument();
  });
});
