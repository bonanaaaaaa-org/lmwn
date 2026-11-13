import type { ReactNode } from "react";
import { Link } from "react-aria-components";

import styles from "./AppShell.module.css";

export const MAIN_CONTENT_ID = "main-content";

export interface AppShellProps {
  children: ReactNode;
}

/** The frame around every page: a skip link, a header linking to the Guide Index, and `<main>`. */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.AppShell__Root}>
      <a className={styles.AppShell__SkipLink} href={`#${MAIN_CONTENT_ID}`}>
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <header className={styles.AppShell__Header}>
        <div className={styles.AppShell__HeaderInner}>
          <Link href="/" className={styles.AppShell__Brand}>
            <span className={styles.AppShell__Mark} aria-hidden="true" />
            <span className={styles.AppShell__BrandText}>
              Hidden Gems
              <span className={styles.AppShell__BrandSub}>ไกด์ร้านลับน่าไป</span>
            </span>
          </Link>
        </div>
      </header>
      <main
        id={MAIN_CONTENT_ID}
        className={styles.AppShell__Main}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
