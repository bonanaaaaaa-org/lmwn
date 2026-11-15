import { Button, type ButtonVariant } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { type ShareTarget, useShare } from "@/hooks/useShare";

export interface ShareButtonProps {
  /** The title, text and link to share, and the toast shown if the link is copied instead. */
  target: ShareTarget;
  /** The visible label, or with `iconOnly` the accessible name only. */
  label: string;
  /** A 48px square with just the share icon (cards, the phone header). */
  iconOnly?: boolean;
  variant?: ButtonVariant;
  className?: string;
  /** The finished `data-testid`, built by the parent component (see `@/lib/testIds`). */
  testId?: string;
}

/**
 * Shares a link through the device share sheet (Web Share API) or, where that isn't
 * available, copies it and confirms with a toast. Pressing it again while a share sheet is
 * open does nothing.
 */
export function ShareButton({
  target,
  label,
  iconOnly = false,
  variant = "secondary",
  className,
  testId,
}: ShareButtonProps) {
  const share = useShare();
  return (
    <Button
      variant={variant}
      iconOnly={iconOnly}
      className={className}
      aria-label={iconOnly ? label : undefined}
      onPress={() => void share(target)}
      testId={testId}
    >
      <Icon name="share" size={iconOnly ? 20 : 18} />
      {!iconOnly && label}
    </Button>
  );
}
