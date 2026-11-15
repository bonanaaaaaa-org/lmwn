import clsx from "clsx";
import type { Ref } from "react";
import {
  Button,
  FieldError,
  Group,
  Input,
  Label,
  SearchField as AriaSearchField,
} from "react-aria-components";

import { Icon } from "@/components/common/Icon";
import { joinTestId } from "@/lib/testIds";
import { m } from "@/paraglide/messages.js";

import styles from "./SearchField.module.css";

export interface SearchFieldProps {
  /** The text in the box (controlled). */
  value: string;
  onChange: (value: string) => void;
  /** Enter pressed. */
  onSubmit?: (value: string) => void;
  /** The clear button or Escape emptied the box. */
  onClear?: () => void;
  /** Defaults to `m.searchField_label()`. */
  label?: string;
  /** Defaults to `m.searchField_input_placeholder()`. */
  placeholder?: string;
  /** Shows a 2px danger border and `errorMessage` under the box. */
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
  /** The `<input>`, e.g. to move focus back to the box after clearing the filters. */
  inputRef?: Ref<HTMLInputElement>;
  /** The parent's test ID; the form is `{parent}/search`, with `/input` and `/clear` inside. */
  parentTestId?: string;
}

/** The Guide Index search box (React Aria SearchField) in a `role="search"` form. */
export function SearchField({
  value,
  onChange,
  onSubmit,
  onClear,
  label,
  placeholder,
  isInvalid = false,
  errorMessage,
  className,
  inputRef,
  parentTestId,
}: SearchFieldProps) {
  const testId = joinTestId(parentTestId, "search");
  return (
    <form
      role="search"
      className={clsx(styles.SearchField__Root, className)}
      data-testid={testId}
      // React Aria reports Enter through onSubmit; never let the browser reload the page.
      onSubmit={(event) => event.preventDefault()}
    >
      <AriaSearchField
        className={styles.SearchField__Field}
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        onClear={onClear}
        isInvalid={isInvalid}
        validationBehavior="aria"
      >
        <Label className={styles.SearchField__Label}>
          {label ?? m.searchField_label()}
        </Label>
        <Group className={styles.SearchField__Box}>
          <Icon
            name="search"
            tone="muted"
            className={styles.SearchField__Icon}
          />
          <Input
            ref={inputRef}
            className={styles.SearchField__Input}
            placeholder={placeholder ?? m.searchField_input_placeholder()}
            data-testid={`${testId}/input`}
          />
          {value !== "" && (
            <Button
              className={styles.SearchField__Clear}
              aria-label={m.searchField_clear_ariaLabel()}
              data-testid={`${testId}/clear`}
            >
              <Icon name="close" size={16} strokeWidth={2.2} />
            </Button>
          )}
        </Group>
        <FieldError className={styles.SearchField__Error}>
          {errorMessage}
        </FieldError>
      </AriaSearchField>
    </form>
  );
}
