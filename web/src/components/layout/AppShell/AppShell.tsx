import type { ReactNode } from "react";

import { Header, type HeaderLayout } from "@/components/layout/Header";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { joinTestId } from "@/lib/testIds";

import styles from "./AppShell.module.css";

const APP_TEST_ID = "app";

export const MAIN_CONTENT_ID = "main-content";

/** What a route module can export as `handle` to shape the shell around its page. */
export interface AppShellRouteHandle {
  /** See `AppShellProps.guidePageTestId`. */
  guidePageTestId?: string;
}

/** The deepest matched route's `guidePageTestId`, from React Router's `useMatches()`. */
export function guidePageTestIdFrom(
  matches: readonly { handle: unknown }[],
): string | undefined {
  for (const { handle } of [...matches].reverse()) {
    if (
      typeof handle === "object" &&
      handle !== null &&
      "guidePageTestId" in handle
    ) {
      const { guidePageTestId } = handle;
      if (typeof guidePageTestId === "string") return guidePageTestId;
    }
  }
  return undefined;
}

export interface AppShellProps {
  /**
   * The page's root test ID when the page wants the Guide header: on a phone the header
   * then shows a back link, `{guidePageTestId}/back-link`, to the Guide Index.
   */
  guidePageTestId?: string;
  children: ReactNode;
}

/**
 * The frame around every page: a skip link, the Header linking to the Guide Index, `<main>`
 * and a footer. Its root is `app`, the header `app/header`, and their links `app/skip-link` and
 * `app/header/logo`.
 */
export function AppShell({ guidePageTestId, children }: AppShellProps) {
  const isPhone = useIsPhone();
  let headerLayout: HeaderLayout = "desktop";
  if (isPhone) headerLayout = guidePageTestId ? "phone-guide" : "phone-index";
  return (
    <div className={styles.AppShell__Root} data-testid={APP_TEST_ID}>
      <a
        className={styles.AppShell__SkipLink}
        href={`#${MAIN_CONTENT_ID}`}
        data-testid={joinTestId(APP_TEST_ID, "skip-link")}
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <Header
        layout={headerLayout}
        parentTestId={APP_TEST_ID}
        backLinkTestId={
          guidePageTestId ? joinTestId(guidePageTestId, "back-link") : undefined
        }
      />
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
