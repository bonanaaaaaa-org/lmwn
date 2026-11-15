import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  NO_RESTAURANT_FILTERS,
  type RestaurantFilters,
} from "@/features/guides/lib/restaurantFilters";
import { m } from "@/paraglide/messages.js";
import { sampleCategories as c } from "@/test-utils/fixtures/guides";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { GuideFilters, type GuideFiltersProps } from "./GuideFilters";

const CATEGORIES = [c.coffee, c.bakery, c.fastFood];

function renderFilters(
  filters: Partial<RestaurantFilters> = {},
  props: Partial<GuideFiltersProps> = {},
) {
  const onChange = vi.fn();
  renderWithProviders(
    <GuideFilters
      categories={CATEGORIES}
      filters={{ ...NO_RESTAURANT_FILTERS, ...filters }}
      shown={4}
      total={4}
      onChange={onChange}
      layout="desktop"
      parentTestId="guide"
      {...props}
    />,
  );
  return { onChange };
}

const chip = (name: string) => screen.getByRole("button", { name });

describe("GuideFilters", () => {
  it("offers a chip per Category, then Open Now, Official, delivery and pickup", () => {
    renderFilters();

    const toolbar = screen.getByTestId("guide/filters");
    expect(toolbar).toHaveAccessibleName(m.guideFilters_ariaLabel());
    expect(
      screen
        .getAllByTestId("guide/filters/category")
        .map((category) => category.textContent),
    ).toEqual(CATEGORIES);
    expect(screen.getByTestId("guide/filters/open-now")).toHaveTextContent(
      m.guideFilters_openNow_label(),
    );
    expect(screen.getByTestId("guide/filters/delivery")).toHaveTextContent(
      m.guideFilters_delivery_label(),
    );
    expect(screen.getByTestId("guide/filters/pickup")).toHaveTextContent(
      m.guideFilters_pickup_label(),
    );
    expect(screen.getByTestId("guide/filters/official")).toHaveTextContent(
      m.guideFilters_official_label(),
    );
    expect(
      within(toolbar).getByText(m.guideFilters_category_title()),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("guide/filters/sort-select/trigger"),
    ).toBeInTheDocument();
  });

  it("puts Open Now and Official first and drops the Category title on a phone", () => {
    renderFilters({}, { layout: "phone" });

    const chips = within(
      screen.getByRole("toolbar", { name: m.guideFilters_group_ariaLabel() }),
    ).getAllByRole("button");
    expect(chips.map((button) => button.textContent)).toEqual([
      m.guideFilters_openNow_label(),
      m.guideFilters_official_label(),
      ...CATEGORIES,
      m.guideFilters_delivery_label(),
      m.guideFilters_pickup_label(),
    ]);
    expect(
      screen.queryByText(m.guideFilters_category_title()),
    ).not.toBeInTheDocument();
  });

  it("marks the selected filters as pressed", () => {
    renderFilters({ categories: [c.bakery], pickup: true });

    expect(chip(c.bakery)).toHaveAttribute("aria-pressed", "true");
    expect(chip(c.coffee)).toHaveAttribute("aria-pressed", "false");
    expect(chip(m.guideFilters_pickup_label())).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(chip(m.guideFilters_openNow_label())).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("adds a pressed Category after the ones already chosen", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({
      categories: [c.fastFood],
      sort: "rating",
    });

    await user.click(chip(c.coffee));

    expect(onChange).toHaveBeenCalledWith({
      ...NO_RESTAURANT_FILTERS,
      categories: [c.fastFood, c.coffee],
      sort: "rating",
    });
  });

  it("removes a selected Category when pressed again", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ categories: [c.coffee, c.bakery] });

    await user.click(chip(c.coffee));

    expect(onChange).toHaveBeenCalledWith({
      ...NO_RESTAURANT_FILTERS,
      categories: [c.bakery],
    });
  });

  it.each([
    ["openNow", m.guideFilters_openNow_label],
    ["delivery", m.guideFilters_delivery_label],
    ["pickup", m.guideFilters_pickup_label],
    ["official", m.guideFilters_official_label],
  ] as const)("toggles %s", async (toggle, label) => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ [toggle]: true });

    await user.click(chip(label()));

    expect(onChange).toHaveBeenCalledWith(NO_RESTAURANT_FILTERS);
  });

  it("puts Official after Open Now and before delivery on desktop", () => {
    renderFilters();

    const toggles = within(
      screen.getByRole("toolbar", { name: m.guideFilters_group_ariaLabel() }),
    )
      .getAllByRole("button")
      .slice(CATEGORIES.length);
    expect(toggles.map((button) => button.textContent)).toEqual([
      m.guideFilters_openNow_label(),
      m.guideFilters_official_label(),
      m.guideFilters_delivery_label(),
      m.guideFilters_pickup_label(),
    ]);
  });

  it.each([false, true])(
    "gives Official a badge-check icon and no check (selected: %s)",
    (official) => {
      renderFilters({ official });

      const icons = screen
        .getByTestId("guide/filters/official")
        .querySelectorAll("[data-icon]");
      expect([...icons].map((icon) => icon.getAttribute("data-icon"))).toEqual([
        "badge-check",
      ]);
    },
  );

  it("labels the Official chip like the card's Official badge", () => {
    renderFilters({ official: true });

    expect(chip(m.restaurantCard_badges_official_label())).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("changes the sort, keeping the filters", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ delivery: true });

    await user.click(screen.getByTestId("guide/filters/sort-select/trigger"));
    await user.click(
      screen.getByRole("option", { name: m.sortSelect_rating_label() }),
    );

    expect(onChange).toHaveBeenCalledWith({
      ...NO_RESTAURANT_FILTERS,
      delivery: true,
      sort: "rating",
    });
  });

  // The parent updates `filters` from the URL in a transition, so a quick second press can
  // arrive before the first press's filters come back as props.
  it("builds a quick second press on the first, before the props catch up", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.click(chip(c.coffee));
    await user.click(chip(m.guideFilters_delivery_label()));
    await user.click(screen.getByTestId("guide/filters/sort-select/trigger"));
    await user.click(
      screen.getByRole("option", { name: m.sortSelect_rating_label() }),
    );

    expect(onChange.mock.calls.map(([filters]) => filters)).toEqual([
      { ...NO_RESTAURANT_FILTERS, categories: [c.coffee] },
      { ...NO_RESTAURANT_FILTERS, categories: [c.coffee], delivery: true },
      {
        ...NO_RESTAURANT_FILTERS,
        categories: [c.coffee],
        delivery: true,
        sort: "rating",
      },
    ]);
  });

  it("starts again from new filters props (Back, or a link)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const props = {
      categories: CATEGORIES,
      shown: 4,
      total: 4,
      onChange,
      layout: "desktop",
      parentTestId: "guide",
    } as const;
    const { rerender } = renderWithProviders(
      <GuideFilters {...props} filters={NO_RESTAURANT_FILTERS} />,
    );

    await user.click(chip(c.coffee));
    rerender(
      <GuideFilters
        {...props}
        filters={{ ...NO_RESTAURANT_FILTERS, pickup: true }}
      />,
    );
    await user.click(chip(m.guideFilters_delivery_label()));

    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_RESTAURANT_FILTERS,
      pickup: true,
      delivery: true,
    });
  });

  it("shows how many Restaurants are shown out of all, politely announced", () => {
    renderFilters({}, { shown: 1, total: 4 });

    const count = screen.getByText(
      m.guideFilters_count_body({ shown: 1, total: 4 }),
    );
    expect(count).toHaveAttribute("aria-live", "polite");
  });

  it("hides the sort label on a phone", () => {
    renderFilters({}, { layout: "phone" });

    expect(
      screen.getByTestId("guide/filters/sort-select/trigger"),
    ).toHaveAccessibleName(
      m.sortSelect_trigger_ariaLabel({
        value: m.sortSelect_guideOrder_label(),
      }),
    );
  });
});
