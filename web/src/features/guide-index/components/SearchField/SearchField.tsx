import clsx from "clsx";
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

import styles from "./SearchField.module.css";

export interface SearchFieldProps {
  /** The text in the box (controlled). */
  value: string;
  onChange: (value: string) => void;
  /** Enter pressed. */
  onSubmit?: (value: string) => void;
  /** The clear button or Escape emptied the box. */
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  /** Shows a 2px danger border and `errorMessage` under the box. */
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
  /** The parent's test ID; the form is `{parent}/search`, with `/input` and `/clear` inside. */
  parentTestId?: string;
}

/** The Guide Index search box (React Aria SearchField) in a `role="search"` form. */
export function SearchField({
  value,
  onChange,
  onSubmit,
  onClear,
  label = "ค้นหาไกด์",
  placeholder = "ชื่อไกด์ คำอธิบาย หรือแท็ก เช่น คาเฟ่",
  isInvalid = false,
  errorMessage,
  className,
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
        <Label className={styles.SearchField__Label}>{label}</Label>
        <Group className={styles.SearchField__Box}>
          <Icon name="search" className={styles.SearchField__Icon} />
          <Input
            className={styles.SearchField__Input}
            placeholder={placeholder}
            data-testid={`${testId}/input`}
          />
          {value !== "" && (
            <Button
              className={styles.SearchField__Clear}
              aria-label="ล้างคำค้นหา"
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
