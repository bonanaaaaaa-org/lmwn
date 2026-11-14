import clsx from "clsx";
import {
  Button as AriaButton,
  Link as AriaLink,
  type ButtonProps as AriaButtonProps,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends Omit<AriaButtonProps, "className"> {
  variant?: ButtonVariant;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/** An action button (React Aria): keyboard, touch and focus handling built in. */
export function Button({
  variant = "primary",
  className,
  testId,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={clsx(styles.Button__Root, className)}
      data-variant={variant}
      data-testid={testId}
    />
  );
}

export interface ButtonLinkProps extends Omit<AriaLinkProps, "className"> {
  variant?: ButtonVariant;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/** Navigation that looks like a button, e.g. "back to the Guide Index". Renders an `<a>`. */
export function ButtonLink({
  variant = "primary",
  className,
  testId,
  ...props
}: ButtonLinkProps) {
  return (
    <AriaLink
      {...props}
      className={clsx(styles.Button__Root, className)}
      data-variant={variant}
      data-testid={testId}
    />
  );
}
