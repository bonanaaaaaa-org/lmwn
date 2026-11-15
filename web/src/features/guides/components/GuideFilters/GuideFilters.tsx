import clsx from "clsx";
import { useLayoutEffect, useRef, type Ref } from "react";
import { ToggleButtonGroup, type Key } from "react-aria-components";

import { FilterChip } from "@/components/common/FilterChip";
import { SortSelect } from "@/features/guides/components/SortSelect";
import {
  toggleCategory,
  type RestaurantFilters,
} from "@/features/guides/lib/restaurantFilters";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./GuideFilters.module.css";

type Toggle = "openNow" | "delivery" | "pickup" | "official";

const TOGGLES: readonly Toggle[] = [
  "openNow",
  "delivery",
  "pickup",
  "official",
];

/** Toggle keys in the chip group; Categories are keyed `category:{name}`. */
const TOGGLE_KEY: Record<Toggle, string> = {
  openNow: "open-now",
  delivery: "delivery",
  pickup: "pickup",
  official: "official",
};

const TOGGLE_LABEL: Record<Toggle, () => string> = {
  openNow: m.guideFilters_openNow_label,
  delivery: m.guideFilters_delivery_label,
  pickup: m.guideFilters_pickup_label,
  official: m.guideFilters_official_label,
};

const categoryKey = (category: string) => `category:${category}`;

function selectedKeys(filters: RestaurantFilters): string[] {
  return [
    ...filters.categories.map(categoryKey),
    ...TOGGLES.filter((toggle) => filters[toggle]).map(
      (toggle) => TOGGLE_KEY[toggle],
    ),
  ];
}

/** The filters after one chip was pressed: the key that joined or left the selection. */
function applyToggledKey(
  filters: RestaurantFilters,
  categories: readonly string[],
  key: Key,
): RestaurantFilters {
  const toggle = TOGGLES.find((candidate) => TOGGLE_KEY[candidate] === key);
  if (toggle) return { ...filters, [toggle]: !filters[toggle] };
  const category = categories.find((name) => categoryKey(name) === key);
  return category
    ? { ...filters, categories: toggleCategory(filters.categories, category) }
    : filters;
}

export interface GuideFiltersProps {
  /** The Guide's Categories, in display order. */
  categories: readonly string[];
  /** The filters in force (Categories the Guide has only). */
  filters: RestaurantFilters;
  /** Guide Items shown with these filters… */
  shown: number;
  /** …out of all the Guide's Items. */
  total: number;
  onChange: (filters: RestaurantFilters) => void;
  /** `desktop` wraps the chips in a card; `phone` scrolls them in one row, Open Now first. */
  layout: "desktop" | "phone";
  className?: string;
  /** The toolbar's root; it takes programmatic focus (`tabIndex={-1}`), e.g. after the filters are cleared. */
  ref?: Ref<HTMLElement>;
  /** The parent's test ID; the toolbar is `{parent}/filters`. */
  parentTestId?: string;
}

/**
 * The Guide page toolbar: Category chips (any one matches), Open Now, delivery, pickup and
 * Official toggles, the "N of M" count and the sort.
 */
export function GuideFilters({
  categories,
  filters,
  shown,
  total,
  onChange,
  layout,
  className,
  ref,
  parentTestId,
}: GuideFiltersProps) {
  const testId = joinTestId(parentTestId, "filters");
  const selected = new Set(selectedKeys(filters));
  const isPhone = layout === "phone";
  // The filters last sent to onChange. The parent gets `filters` back from the URL in a
  // transition, so a quick second press can arrive before the first press's filters return
  // as props; each press builds on what was last asked for, not on this render's props.
  // New props (the URL caught up, Back, a link) take over again.
  const latest = useRef(filters);
  useLayoutEffect(() => {
    latest.current = filters;
  }, [filters]);
  const change = (
    update: (current: RestaurantFilters) => RestaurantFilters,
  ) => {
    latest.current = update(latest.current);
    onChange(latest.current);
  };

  const toggleChip = (toggle: Toggle) => (
    <FilterChip
      id={TOGGLE_KEY[toggle]}
      label={TOGGLE_LABEL[toggle]()}
      icon={toggle === "openNow" ? "clock" : "none"}
      selected={filters[toggle]}
      testId={`${testId}/${TOGGLE_KEY[toggle]}`}
    />
  );

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={m.guideFilters_ariaLabel()}
      className={clsx(styles.GuideFilters__Root, className)}
      data-layout={layout}
      data-testid={testId}
    >
      <ToggleButtonGroup
        aria-label={m.guideFilters_group_ariaLabel()}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          const changed =
            [...keys].find((key) => !selected.has(String(key))) ??
            [...selected].find((key) => !keys.has(key));
          if (changed !== undefined) {
            change((current) => applyToggledKey(current, categories, changed));
          }
        }}
        className={styles.GuideFilters__Chips}
      >
        {isPhone && toggleChip("openNow")}
        {!isPhone && categories.length > 0 && (
          <span className={styles.GuideFilters__ChipsTitle}>
            {m.guideFilters_category_title()}
          </span>
        )}
        {categories.map((category) => (
          <FilterChip
            key={category}
            id={categoryKey(category)}
            label={category}
            selected={filters.categories.includes(category)}
            testId={`${testId}/category`}
          />
        ))}
        {!isPhone && categories.length > 0 && (
          <span aria-hidden="true" className={styles.GuideFilters__Divider} />
        )}
        {!isPhone && toggleChip("openNow")}
        {toggleChip("delivery")}
        {toggleChip("pickup")}
        {toggleChip("official")}
      </ToggleButtonGroup>
      <div className={styles.GuideFilters__Summary}>
        <p aria-live="polite" className={styles.GuideFilters__Count}>
          {m.guideFilters_count_body({ shown, total })}
        </p>
        <SortSelect
          value={filters.sort}
          onChange={(sort) => change((current) => ({ ...current, sort }))}
          showLabel={!isPhone}
          parentTestId={testId}
        />
      </div>
    </section>
  );
}
