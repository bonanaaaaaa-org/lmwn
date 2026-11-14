import clsx from "clsx";
import { useId } from "react";
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";

import { Icon } from "@/components/common/Icon";
import type { RestaurantSort } from "@/features/guides/lib/restaurantFilters";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./SortSelect.module.css";

const SORTS: readonly RestaurantSort[] = ["guide", "rating"];

function sortLabel(sort: RestaurantSort): string {
  return sort === "rating"
    ? m.sortSelect_rating_label()
    : m.sortSelect_guideOrder_label();
}

export interface SortSelectProps {
  value: RestaurantSort;
  onChange: (sort: RestaurantSort) => void;
  /**
   * Show the "sort by" label beside the trigger (desktop). Hidden (phones), the trigger is
   * named `m.sortSelect_trigger_ariaLabel({ value })` instead.
   */
  showLabel?: boolean;
  className?: string;
  /** The parent's test ID; the select is `{parent}/sort-select`, its button `{parent}/sort-select/trigger`. */
  parentTestId?: string;
}

/** Sorts a Guide's Restaurants by guide order or Rating (React Aria Select). */
export function SortSelect({
  value,
  onChange,
  showLabel = true,
  className,
  parentTestId,
}: SortSelectProps) {
  const testId = joinTestId(parentTestId, "sort-select");
  const triggerNameId = useId();
  return (
    <Select
      value={value}
      onChange={(key) => {
        const sort = SORTS.find((candidate) => candidate === key);
        if (sort) onChange(sort);
      }}
      aria-label={showLabel ? undefined : m.sortSelect_label()}
      className={clsx(styles.SortSelect__Root, className)}
      data-testid={testId}
    >
      {showLabel && (
        <Label className={styles.SortSelect__Label}>
          {m.sortSelect_label()}
        </Label>
      )}
      <Button
        className={styles.SortSelect__Trigger}
        data-label={showLabel ? "shown" : "hidden"}
        // Without a visible label the trigger reads "sort by: {value}", not "{value} sort by".
        aria-labelledby={showLabel ? undefined : triggerNameId}
        data-testid={`${testId}/trigger`}
      >
        <SelectValue />
        <Icon
          name="chevron-down"
          size={16}
          className={styles.SortSelect__Chevron}
        />
      </Button>
      {!showLabel && (
        <span id={triggerNameId} hidden>
          {m.sortSelect_trigger_ariaLabel({ value: sortLabel(value) })}
        </span>
      )}
      <Popover className={styles.SortSelect__Popover} placement="bottom end">
        <ListBox className={styles.SortSelect__List}>
          {SORTS.map((sort) => (
            <ListBoxItem
              key={sort}
              id={sort}
              textValue={sortLabel(sort)}
              className={styles.SortSelect__Option}
            >
              {({ isSelected }) => (
                <>
                  <span>{sortLabel(sort)}</span>
                  {isSelected && (
                    <Icon name="check" size={16} strokeWidth={2.4} />
                  )}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
