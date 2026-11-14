import { Link } from "react-aria-components";

import { Icon } from "@/components/common/Icon";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { joinTestId } from "@/lib/testIds";
import { useThemeChoice } from "@/lib/theme";
import { m } from "@/paraglide/messages.js";

import styles from "./Header.module.css";
import { HeaderSlotTarget } from "./HeaderSlot";

export type HeaderLayout = "desktop" | "phone-index" | "phone-guide";

export interface HeaderProps {
  /**
   * `desktop` (64px, logo and tagline) and `phone-index` (56px, logo only) show the brand;
   * `phone-guide` (56px) is the Guide page on a phone: a back arrow, the brand, then the
   * page's action from `HeaderSlotPortal` (the Guide's share button). Every layout ends with
   * the theme toggle (`{parent}/header/theme-toggle`).
   */
  layout?: HeaderLayout;
  /** The Guide Index. */
  homeHref?: string;
  /** The finished test ID of the `phone-guide` back link, e.g. `guide/back-link`. */
  backLinkTestId?: string;
  /** The shell's test ID; the header is `{parent}/header`, its logo `{parent}/header/logo`. */
  parentTestId?: string;
}

function Mark() {
  return (
    <svg
      className={styles.Header__Mark}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M2 9h20" />
      <path d="M12 21 8 9l4-6 4 6z" />
    </svg>
  );
}

/**
 * The bar at the top of every page, linking back to the Guide Index. It owns its copy, so its
 * messages are `header_*` (not `app_header_*`) wherever it is mounted.
 */
export function Header({
  layout = "desktop",
  homeHref = "/",
  backLinkTestId,
  parentTestId,
}: HeaderProps) {
  const testId = joinTestId(parentTestId, "header");
  const logoTestId = `${testId}/logo`;
  const [theme, setTheme] = useThemeChoice();
  const themeToggle = (
    <ThemeToggle value={theme} onChange={setTheme} parentTestId={testId} />
  );

  if (layout === "phone-guide") {
    return (
      <header
        className={styles.Header__Root}
        data-layout={layout}
        data-testid={testId}
      >
        <div className={styles.Header__Bar}>
          <Link
            href={homeHref}
            className={styles.Header__Back}
            aria-label={m.header_backLink_ariaLabel()}
            data-testid={backLinkTestId}
          >
            <Icon name="arrow-left" size={24} />
          </Link>
          <Link
            href={homeHref}
            className={styles.Header__Brand}
            data-testid={logoTestId}
          >
            <span lang="en">{m.header_logo_label()}</span>
          </Link>
          <div className={styles.Header__Actions}>
            {themeToggle}
            {/* The page's action (the Guide's share button). */}
            <HeaderSlotTarget className={styles.Header__Spacer} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={styles.Header__Root}
      data-layout={layout}
      data-testid={testId}
    >
      <div className={styles.Header__Bar}>
        <Link
          href={homeHref}
          className={styles.Header__Brand}
          data-testid={logoTestId}
        >
          <Mark />
          <span lang="en">{m.header_logo_label()}</span>
        </Link>
        <div className={styles.Header__Actions}>
          <p className={styles.Header__Tagline}>{m.header_tagline_body()}</p>
          {themeToggle}
        </div>
      </div>
    </header>
  );
}
