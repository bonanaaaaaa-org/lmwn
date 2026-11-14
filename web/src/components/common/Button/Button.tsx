import clsx from "clsx";
import {
  Button as AriaButton,
  Link as AriaLink,
  type ButtonProps as AriaButtonProps,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";

import styles from "./Button.module.css";

/**
 * `primary` saffron fill · `secondary` white with a strong edge · `ghost` white with a light
 * edge (contact links) · `inverse` ink fill (the phone call action) · `text` a gold text link ·
 * `overlay` a round, translucent white control on dark surfaces (the lightbox).
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "inverse"
  | "text"
  | "overlay";
/** `default` is 48px tall, `compact` 40px. */
export type ButtonSize = "default" | "compact";

export interface ButtonProps extends Omit<AriaButtonProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/** An action button (React Aria): keyboard, touch and focus handling built in. */
export function Button({
  variant = "primary",
  size = "default",
  className,
  testId,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={clsx(styles.Button__Root, className)}
      data-variant={variant}
      data-size={size}
      data-testid={testId}
    />
  );
}

export interface ButtonLinkProps extends Omit<AriaLinkProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/** Navigation that looks like a button, e.g. "back to the Guide Index". Renders an `<a>`. */
export function ButtonLink({
  variant = "primary",
  size = "default",
  className,
  testId,
  ...props
}: ButtonLinkProps) {
  return (
    <AriaLink
      {...props}
      className={clsx(styles.Button__Root, className)}
      data-variant={variant}
      data-size={size}
      data-testid={testId}
    />
  );
}
