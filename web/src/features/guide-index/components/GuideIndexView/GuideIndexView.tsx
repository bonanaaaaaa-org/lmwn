import clsx from "clsx";
import { useId } from "react";

import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { FilterTagGroup } from "@/components/common/FilterTag";
import { SkeletonGroup } from "@/components/common/Skeleton";
import { GuideCard } from "@/features/guide-index/components/GuideCard";
import { SearchField } from "@/features/guide-index/components/SearchField";
import { SkeletonCard } from "@/features/guide-index/components/SkeletonCard";
import { photoSources } from "@/features/guides/lib/format";
import {
  addTag,
  buildIndexHref,
  normaliseSearchText,
  type GuideIndexFilters,
} from "@/features/guide-index/lib/filters";
import type { GuideSummary } from "@/features/guide-index/lib/types";

import styles from "./GuideIndexView.module.css";

export const GUIDE_INDEX_TEST_ID = "guide-index";

interface Retry {
  onRetry: () => void;
  isRetrying: boolean;
}

/** What the results area shows. */
export type GuideIndexResults =
  /** Nothing loaded yet: skeleton cards. */
  | { status: "loading" }
  /** Nothing loaded and the request failed: a block error panel. */
  | ({ status: "error" } & Retry)
  /**
   * Guides on screen. `isUpdating` while a newer search loads (they stay visible);
   * `error` when that newer search failed, so these are the previous results.
   */
  | {
      status: "ready";
      guides: readonly GuideSummary[];
      total: number;
      isUpdating: boolean;
      error?: Retry;
    };

export interface GuideIndexViewProps {
  /** The filters in the URL: what the results are for. */
  filters: GuideIndexFilters;
  results: GuideIndexResults;
  /** The Tags on offer (every Tag across all Guides, plus any selected one). */
  tags: readonly string[];
  /** The text in the search box, which can run ahead of `filters.q` while typing. */
  searchText: string;
  isSearchTooLong: boolean;
  onSearchTextChange: (text: string) => void;
  onSearchSubmit: (text: string) => void;
  onSearchClear: () => void;
  onTagsChange: (tags: string[]) => void;
  onClearAll: () => void;
  /** Phones get the phone card layout and a single scrolling row of Tags. */
  layout?: "desktop" | "phone";
}

function emptyTitle({ q, tags }: GuideIndexFilters): string {
  const text = normaliseSearchText(q);
  if (text) return `ไม่พบไกด์ที่ตรงกับ “${text}”`;
  if (tags.length > 0) return "ไม่พบไกด์ที่มีแท็กที่เลือก";
  return "ยังไม่มีไกด์";
}

function failedSearchDescription({ q }: GuideIndexFilters): string {
  const text = normaliseSearchText(q);
  return text
    ? `ค้นหา “${text}” ไม่สำเร็จ ผลที่แสดงอยู่เป็นผลก่อนหน้า`
    : "กรองตามแท็กไม่สำเร็จ ผลที่แสดงอยู่เป็นผลก่อนหน้า";
}

/**
 * The Guide Index screen, from props only: hero and search, the Tag filter, and the results
 * in each state. `GuideIndexPage` wires it to the URL and the gateway.
 */
export function GuideIndexView({
  filters,
  results,
  tags,
  searchText,
  isSearchTooLong,
  onSearchTextChange,
  onSearchSubmit,
  onSearchClear,
  onTagsChange,
  onClearAll,
  layout = "desktop",
}: GuideIndexViewProps) {
  const testId = GUIDE_INDEX_TEST_ID;
  const tagsHeadingId = useId();
  const resultsHeadingId = useId();
  const hasFilters =
    normaliseSearchText(filters.q) !== "" || filters.tags.length > 0;
  const tagHref = (tag: string) => buildIndexHref(addTag(filters, tag));

  return (
    <div className={styles.GuideIndexView__Root} data-testid={testId}>
      <section className={styles.GuideIndexView__Hero}>
        <h1 className={styles.GuideIndexView__Title}>
          หาร้านที่ใช่ จากไกด์ที่คัดมาแล้ว
        </h1>
        <p className={styles.GuideIndexView__Lead}>
          ไกด์ร้านอาหารและคาเฟ่ตามธีม ทั้งทริปเที่ยว เมนูกำลังฮิต หรือมื้อใหญ่กับแก๊งเพื่อน
        </p>
        <SearchField
          className={styles.GuideIndexView__Search}
          value={searchText}
          onChange={onSearchTextChange}
          onSubmit={onSearchSubmit}
          onClear={onSearchClear}
          isInvalid={isSearchTooLong}
          errorMessage="คำค้นหายาวเกิน 100 ตัวอักษร"
          parentTestId={testId}
        />
      </section>

      {tags.length > 0 && (
        <section
          className={styles.GuideIndexView__TagFilter}
          aria-labelledby={tagsHeadingId}
          data-testid={`${testId}/tag-filter`}
        >
          <h2 id={tagsHeadingId} className={styles.GuideIndexView__TagHeading}>
            กรองตามแท็ก
          </h2>
          <FilterTagGroup
            aria-labelledby={tagsHeadingId}
            tags={tags}
            selectedTags={filters.tags}
            onSelectionChange={onTagsChange}
            layout={layout === "phone" ? "scroll" : "wrap"}
            tagTestId={`${testId}/tag-filter/tag`}
          />
        </section>
      )}

      <section
        className={styles.GuideIndexView__Results}
        aria-labelledby={resultsHeadingId}
      >
        <div className={styles.GuideIndexView__ResultsHeader}>
          <h2
            id={resultsHeadingId}
            className={styles.GuideIndexView__ResultsHeading}
          >
            ไกด์ทั้งหมด
          </h2>
          <div className={styles.GuideIndexView__Summary}>
            <p className={styles.GuideIndexView__Count} aria-live="polite">
              {results.status === "ready" ? `พบ ${results.total} ไกด์` : ""}
            </p>
            {hasFilters && (
              <Button
                variant="text"
                onPress={onClearAll}
                testId={`${testId}/clear-all`}
              >
                ล้างทั้งหมด
              </Button>
            )}
          </div>
        </div>

        {results.status === "loading" && (
          <SkeletonGroup label="กำลังโหลดไกด์…">
            <div className={styles.GuideIndexView__Grid}>
              {Array.from({ length: layout === "phone" ? 2 : 3 }, (_, i) => (
                <SkeletonCard key={i} layout={layout} />
              ))}
            </div>
          </SkeletonGroup>
        )}

        {results.status === "error" && (
          <ErrorPanel
            onRetry={results.onRetry}
            isRetrying={results.isRetrying}
            headingLevel={3}
            parentTestId={testId}
          />
        )}

        {results.status === "ready" && results.error && (
          <ErrorPanel
            variant="inline"
            description={failedSearchDescription(filters)}
            onRetry={results.error.onRetry}
            isRetrying={results.error.isRetrying}
            headingLevel={3}
            parentTestId={testId}
          />
        )}

        {results.status === "ready" &&
          (results.guides.length > 0 ? (
            <ul
              className={clsx(
                styles.GuideIndexView__Grid,
                styles.GuideIndexView__List,
              )}
              aria-busy={results.isUpdating}
            >
              {results.guides.map((guide, index) => (
                <li key={guide.id}>
                  <GuideCard
                    guide={{
                      title: guide.title,
                      count: guide.itemCount,
                      description: guide.shortDescription,
                      cover: photoSources(guide.coverPhoto),
                      tags: guide.tags,
                      href: `/guides/${encodeURIComponent(guide.id)}`,
                    }}
                    layout={layout}
                    tagHref={tagHref}
                    priority={index === 0}
                    parentTestId={testId}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={emptyTitle(filters)}
              description={
                hasFilters ? "ลองใช้คำที่สั้นลง หรือเอาแท็กออกเพื่อดูไกด์ทั้งหมด" : undefined
              }
              actionLabel={hasFilters ? "ล้างการค้นหา" : undefined}
              actionHref="/"
              headingLevel={3}
              parentTestId={testId}
            />
          ))}
      </section>
    </div>
  );
}
