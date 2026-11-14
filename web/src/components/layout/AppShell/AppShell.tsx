import type { ReactNode } from "react";
import { Link } from "react-aria-components";

import { testId } from "@/lib/testIds";

import styles from "./AppShell.module.css";

export const MAIN_CONTENT_ID = "main-content";

export interface AppShellProps {
  children: ReactNode;
}

/**
 * The frame around every page: a skip link, a header linking to the Guide Index, `<main>`
 * and a footer. It sits outside any route, so its test IDs use the `app` page segment:
 * `app/skip-link`, `app/header/logo`.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.AppShell__Root}>
      <a
        className={styles.AppShell__SkipLink}
        href={`#${MAIN_CONTENT_ID}`}
        data-testid={testId("app", "skip-link")}
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <header className={styles.AppShell__Header}>
        <div className={styles.AppShell__Bar}>
          <Link
            href="/"
            className={styles.AppShell__Brand}
            data-testid={testId("app", "header", "logo")}
          >
            <svg
              className={styles.AppShell__Mark}
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 3h12l4 6-10 12L2 9z" />
              <path d="M2 9h20" />
              <path d="M12 21 8 9l4-6 4 6z" />
            </svg>
            <span lang="en">Guide to Hidden Gems</span>
          </Link>
          <p className={styles.AppShell__Tagline}>ไกด์ร้านลับ คัดโดยบรรณาธิการ</p>
        </div>
      </header>
      <main
        id={MAIN_CONTENT_ID}
        className={styles.AppShell__Main}
        tabIndex={-1}
      >
        {children}
      </main>
      <footer className={styles.AppShell__Footer}>
        <div className={styles.AppShell__Bar}>
          <p>
            <span lang="en">Guide to Hidden Gems</span> · ข้อมูลตัวอย่างสำหรับงาน
            Assignment
          </p>
        </div>
      </footer>
    </div>
  );
}
