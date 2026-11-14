import { useEffect } from "react";

import { ButtonLink } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { Icon } from "@/components/common/Icon";
import { NotFound } from "@/components/common/NotFound";
import { GuideHeader } from "@/features/guides/components/GuideHeader";
import { GuidePageSkeleton } from "@/features/guides/components/GuidePageSkeleton";
import {
  needsClamp,
  RestaurantCard,
} from "@/features/guides/components/RestaurantCard";
import { useGuide } from "@/features/guides/hooks/useGuide";
import type { Guide } from "@/features/guides/lib/types";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { ApiError, InvalidResponseError } from "@/lib/apiClient";

import styles from "./GuidePage.module.css";

/** The Guide page's root test ID; its components hang theirs under it. */
export const GUIDE_PAGE_TEST_ID = "guide";

export interface GuidePageProps {
  guideId: string;
}

type Layout = "desktop" | "phone";

function GuideContent({ guide, layout }: { guide: Guide; layout: Layout }) {
  return (
    <>
      {layout === "desktop" && (
        // On a phone the header carries this link instead (see AppShell).
        <ButtonLink
          href="/"
          variant="text"
          className={styles.GuidePage__Back}
          testId={`${GUIDE_PAGE_TEST_ID}/back-link`}
        >
          <Icon name="chevron-left" size={16} />
          ไกด์ทั้งหมด
        </ButtonLink>
      )}
      <GuideHeader
        guide={guide}
        layout={layout}
        className={styles.GuidePage__Top}
        parentTestId={GUIDE_PAGE_TEST_ID}
      />
      {guide.items.length === 0 ? (
        <EmptyState
          title="ไกด์นี้ยังไม่มีร้าน"
          description="บรรณาธิการยังไม่ได้เพิ่มร้านในไกด์นี้ ลองดูไกด์อื่นไปก่อน"
          actionLabel="ดูไกด์ทั้งหมด"
          actionHref="/"
          parentTestId={GUIDE_PAGE_TEST_ID}
        />
      ) : (
        <ol className={styles.GuidePage__Items} aria-label="ร้านในไกด์นี้">
          {guide.items.map((item, index) => (
            <li key={item.id}>
              <RestaurantCard
                item={item}
                index={index + 1}
                layout={layout}
                clamp={needsClamp(item.description, layout)}
                parentTestId={GUIDE_PAGE_TEST_ID}
              />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/**
 * A Guide at `/guides/:guideId`: its header and one card per Guide Item in the editor's
 * order, with loading, not-found, error and empty states. The tab title is the socialTitle.
 */
export function GuidePage({ guideId }: GuidePageProps) {
  const query = useGuide(guideId);
  const layout: Layout = useIsPhone() ? "phone" : "desktop";
  useDocumentTitle(query.data?.socialTitle);

  useEffect(() => {
    // A 2xx body that breaks the contract is a bug, not bad luck: leave a trail for it.
    if (query.error instanceof InvalidResponseError) {
      // oxlint-disable-next-line no-console
      console.error(query.error, query.error.issues);
    }
  }, [query.error]);

  let content;
  if (query.isPending) {
    content = (
      <GuidePageSkeleton
        layout={layout}
        className={styles.GuidePage__Top}
        parentTestId={GUIDE_PAGE_TEST_ID}
      />
    );
  } else if (query.isError) {
    content =
      query.error instanceof ApiError && query.error.status === 404 ? (
        <NotFound
          title="ไม่พบไกด์นี้"
          description="ไกด์นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง"
          parentTestId={GUIDE_PAGE_TEST_ID}
        />
      ) : (
        <ErrorPanel
          title="โหลดไกด์ไม่สำเร็จ"
          headingLevel={1}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
          parentTestId={GUIDE_PAGE_TEST_ID}
        />
      );
  } else {
    content = <GuideContent guide={query.data} layout={layout} />;
  }

  return (
    <div
      className={styles.GuidePage__Root}
      data-layout={layout}
      data-testid={GUIDE_PAGE_TEST_ID}
    >
      {content}
    </div>
  );
}
