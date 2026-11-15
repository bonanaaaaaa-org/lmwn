import clsx from "clsx";
import { ToggleButton, type ToggleButtonProps } from "react-aria-components";

import { Icon } from "@/components/common/Icon";

import styles from "./FilterChip.module.css";

export type FilterChipIcon = "none" | "clock" | "badge-check";

export interface FilterChipProps extends Omit<
  ToggleButtonProps,
  "className" | "children" | "isSelected" | "style"
> {
  label: string;
  /**
   * Selected on its own; inside a `ToggleButtonGroup` the group's `selectedKeys` decide
   * (pass the same value so both agree).
   */
  selected?: boolean;
  /** A leading icon (a clock for Open Now, a badge check for Official), in both states. */
  icon?: FilterChipIcon;
  className?: string;
  /** The finished `data-testid`, e.g. `guide/filters/open-now`. */
  testId?: string;
}

/**
 * A filter toggle: a 40px pill (React Aria ToggleButton, so `aria-pressed`). Selected is a
 * saffron fill and weight 600, with no check. Use inside a `ToggleButtonGroup` with an `id`.
 */
export function FilterChip({
  label,
  selected,
  icon = "none",
  className,
  testId,
  ...props
}: FilterChipProps) {
  return (
    <ToggleButton
      {...props}
      isSelected={selected}
      className={clsx(styles.FilterChip__Root, className)}
      data-testid={testId}
    >
      {({ isSelected }) => (
        <>
          {icon !== "none" && (
            <span className={styles.FilterChip__Icon}>
              <Icon name={icon} size={16} strokeWidth={isSelected ? 2.4 : 2} />
            </span>
          )}
          <span>{label}</span>
        </>
      )}
    </ToggleButton>
  );
}
