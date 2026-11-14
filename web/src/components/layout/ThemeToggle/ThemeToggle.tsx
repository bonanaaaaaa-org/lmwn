import clsx from "clsx";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Tooltip,
  TooltipTrigger,
} from "react-aria-components";

import { Icon, type IconName } from "@/components/common/Icon";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./ThemeToggle.module.css";

const ICONS: Record<ThemeChoice, IconName> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

function choiceLabel(choice: ThemeChoice): string {
  if (choice === "light") return m.themeToggle_option_lightLabel();
  if (choice === "dark") return m.themeToggle_option_darkLabel();
  return m.themeToggle_option_systemLabel();
}

export interface ThemeToggleProps {
  /** The viewer's current choice; its icon shows on the button. */
  value: ThemeChoice;
  onChange: (choice: ThemeChoice) => void;
  className?: string;
  /**
   * The parent's test ID. The toggle is `{parent}/theme-toggle`, with `…/trigger` (the button),
   * `…/menu` and `…/option` (repeated; the checked one has `aria-checked="true"`).
   */
  parentTestId?: string;
}

/**
 * The header's icon-only theme control (the design canvas's "Theme toggle" board): a monitor, sun or moon for the current choice, opening
 * a menu of system, light and dark. Its accessible name and tooltip say the current theme
 * (`m.themeToggle_trigger_ariaLabel`); the icons are hidden from assistive tech.
 */
export function ThemeToggle({
  value,
  onChange,
  className,
  parentTestId,
}: ThemeToggleProps) {
  const testId = joinTestId(parentTestId, "theme-toggle");
  const label = m.themeToggle_trigger_ariaLabel({ theme: choiceLabel(value) });
  return (
    <span
      className={clsx(styles.ThemeToggle__Root, className)}
      data-testid={testId}
    >
      <MenuTrigger>
        <TooltipTrigger delay={500}>
          <Button
            className={styles.ThemeToggle__Trigger}
            aria-label={label}
            data-testid={`${testId}/trigger`}
          >
            <Icon name={ICONS[value]} size={20} />
          </Button>
          <Tooltip className={styles.ThemeToggle__Tooltip} offset={8}>
            {label}
          </Tooltip>
        </TooltipTrigger>
        <Popover className={styles.ThemeToggle__Popover} placement="bottom end">
          <Menu
            className={styles.ThemeToggle__Menu}
            data-testid={`${testId}/menu`}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[value]}
            onSelectionChange={(keys) => {
              const choice = THEME_CHOICES.find(
                (candidate) => keys !== "all" && keys.has(candidate),
              );
              if (choice) onChange(choice);
            }}
          >
            {THEME_CHOICES.map((choice) => (
              <MenuItem
                key={choice}
                id={choice}
                textValue={choiceLabel(choice)}
                className={styles.ThemeToggle__Option}
                data-testid={`${testId}/option`}
              >
                {({ isSelected }) => (
                  <>
                    <Icon name={ICONS[choice]} size={18} />
                    <span className={styles.ThemeToggle__OptionLabel}>
                      {choiceLabel(choice)}
                    </span>
                    {isSelected && (
                      <Icon
                        name="check"
                        size={16}
                        strokeWidth={2.4}
                        className={styles.ThemeToggle__Check}
                      />
                    )}
                  </>
                )}
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
    </span>
  );
}
