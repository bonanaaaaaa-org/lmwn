import clsx from "clsx";
import {
  Tag,
  TagGroup,
  TagList,
  type Key,
  type Selection,
} from "react-aria-components";

import { Icon } from "@/components/common/Icon";

import styles from "./FilterTag.module.css";

export interface FilterTagProps {
  /** The Tag text, exactly as the editor wrote it; shown with a leading "#". */
  tag: string;
  isDisabled?: boolean;
  /** The finished `data-testid`, e.g. `guide-index/tag-filter/tag`. */
  testId?: string;
}

/**
 * One selectable Tag: a 40px pill. Selected is a saffron fill, weight 600 and a trailing
 * check. Use inside `FilterTagGroup` (a React Aria TagGroup row, so `aria-selected`).
 */
export function FilterTag({ tag, isDisabled, testId }: FilterTagProps) {
  return (
    <Tag
      id={tag}
      textValue={`#${tag}`}
      isDisabled={isDisabled}
      className={styles.FilterTag__Root}
      data-testid={testId}
    >
      {({ isSelected }) => (
        <>
          <span>#{tag}</span>
          {isSelected && (
            <Icon
              name="check"
              size={14}
              strokeWidth={2.4}
              className={styles.FilterTag__Check}
            />
          )}
        </>
      )}
    </Tag>
  );
}

export interface FilterTagGroupProps {
  /** The Tags on offer, in display order. */
  tags: readonly string[];
  /** The selected Tags, in the order they were chosen. */
  selectedTags: readonly string[];
  /** Called with the new selection: kept Tags in their order, then the newly added one. */
  onSelectionChange: (tags: string[]) => void;
  disabledTags?: readonly string[];
  /** `wrap` onto several lines (desktop) or one horizontally scrolling `scroll` row (phones). */
  layout?: "wrap" | "scroll";
  /** Label the group with a visible heading's id… */
  "aria-labelledby"?: string;
  /** …or a text label. */
  "aria-label"?: string;
  className?: string;
  /** The finished `data-testid` for every Tag, e.g. `guide-index/tag-filter/tag`. */
  tagTestId?: string;
}

function toTags(selection: Selection, all: readonly string[]): Set<string> {
  return selection === "all"
    ? new Set(all)
    : new Set([...selection].map((key: Key) => String(key)));
}

/** A multi-select set of Tags (React Aria TagGroup): arrow keys move, Enter/Space toggle. */
export function FilterTagGroup({
  tags,
  selectedTags,
  onSelectionChange,
  disabledTags = [],
  layout = "wrap",
  className,
  tagTestId,
  ...labelling
}: FilterTagGroupProps) {
  return (
    <TagGroup
      {...labelling}
      selectionMode="multiple"
      selectedKeys={selectedTags}
      disabledKeys={disabledTags}
      onSelectionChange={(selection) => {
        const next = toTags(selection, tags);
        onSelectionChange([
          ...selectedTags.filter((tag) => next.has(tag)),
          ...[...next].filter((tag) => !selectedTags.includes(tag)),
        ]);
      }}
      className={clsx(styles.FilterTag__Group, className)}
    >
      <TagList className={styles.FilterTag__List} data-layout={layout}>
        {tags.map((tag) => (
          <FilterTag
            key={tag}
            tag={tag}
            isDisabled={disabledTags.includes(tag)}
            testId={tagTestId}
          />
        ))}
      </TagList>
    </TagGroup>
  );
}
