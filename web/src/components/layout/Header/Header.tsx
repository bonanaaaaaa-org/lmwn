import { Link } from "react-aria-components";

import { Icon } from "@/components/common/Icon";
import { joinTestId } from "@/lib/testIds";

import styles from "./Header.module.css";
import { HeaderSlotTarget } from "./HeaderSlot";

export type HeaderLayout = "desktop" | "phone-index" | "phone-guide";

export interface HeaderProps {
  /**
   * `desktop` (64px, logo and tagline) and `phone-index` (56px, logo only) show the brand;
   * `phone-guide` (56px) is the Guide page on a phone: a back arrow, the brand, then the
   * page's action from `HeaderSlotPortal` (the Guide's share button).
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

/** The bar at the top of every page, linking back to the Guide Index. */
export function Header({
  layout = "desktop",
  homeHref = "/",
  backLinkTestId,
  parentTestId,
}: HeaderProps) {
  const testId = joinTestId(parentTestId, "header");
  const logoTestId = `${testId}/logo`;

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
            aria-label="กลับไปไกด์ทั้งหมด"
            data-testid={backLinkTestId}
          >
            <Icon name="arrow-left" size={24} />
          </Link>
          <Link
            href={homeHref}
            className={styles.Header__Brand}
            data-testid={logoTestId}
          >
            <span lang="en">Guide to Hidden Gems</span>
          </Link>
          {/* The page's action (the Guide's share button); it balances the back arrow so the brand stays centred. */}
          <HeaderSlotTarget className={styles.Header__Spacer} />
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
          <span lang="en">Guide to Hidden Gems</span>
        </Link>
        <p className={styles.Header__Tagline}>ไกด์ร้านลับ คัดโดยบรรณาธิการ</p>
      </div>
    </header>
  );
}
