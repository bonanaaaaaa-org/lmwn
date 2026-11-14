import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { ButtonLink } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { Icon } from "@/components/common/Icon";
import { NotFound } from "@/components/common/NotFound";
import { GuideFilters } from "@/features/guides/components/GuideFilters";
import { GuideHeader } from "@/features/guides/components/GuideHeader";
import { GuidePageSkeleton } from "@/features/guides/components/GuidePageSkeleton";
import {
  needsClamp,
  RestaurantCard,
} from "@/features/guides/components/RestaurantCard";
import { useGuide } from "@/features/guides/hooks/useGuide";
import { useGuideItemHashTarget } from "@/features/guides/hooks/useGuideItemHashTarget";
import {
  applyRestaurantFilters,
  categoriesOf,
  clearRestaurantFilters,
  parseRestaurantFilters,
  toRestaurantSearchParams,
  withKnownCategories,
  type RestaurantFilters,
} from "@/features/guides/lib/restaurantFilters";
import {
  guideItemShareTarget,
  guideShareTarget,
} from "@/features/guides/lib/share";
import type { Guide } from "@/features/guides/lib/types";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { useNow } from "@/hooks/useNow";
import { ApiError, InvalidResponseError } from "@/lib/apiClient";
import { m } from "@/paraglide/messages.js";

import styles from "./GuidePage.module.css";

/** The Guide page's root test ID; its components hang theirs under it. */
export const GUIDE_PAGE_TEST_ID = "guide";

export interface GuidePageProps {
  guideId: string;
}

type Layout = "desktop" | "phone";

/**
 * The toolbar's filters and sort, kept in the URL (`?category=…&openNow=1&sort=rating`), so
 * reload, share and Back restore them. Each change is a history push.
 */
function useRestaurantFilters(guide: Guide) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const now = useNow();
  const categories = useMemo(() => categoriesOf(guide.items), [guide.items]);
  // Categories this Guide doesn't have (an old or edited link) are ignored.
  const filters = useMemo(
    () => withKnownCategories(parseRestaurantFilters(searchParams), categories),
    [searchParams, categories],
  );
  const placed = useMemo(
    () =>
      applyRestaurantFilters(guide.items, filters, {
        now,
        timeZone: guide.timeZone,
      }),
    [guide.items, guide.timeZone, filters, now],
  );
  const setFilters = (next: RestaurantFilters) => {
    const search = toRestaurantSearchParams(next).toString();
    void navigate(
      { pathname, search: search ? `?${search}` : "" },
      { preventScrollReset: true },
    );
  };
  return { categories, filters, placed, setFilters };
}

function GuideContent({ guide, layout }: { guide: Guide; layout: Layout }) {
  const { categories, filters, placed, setFilters } =
    useRestaurantFilters(guide);
  const shownIds = useMemo(() => placed.map(({ item }) => item.id), [placed]);
  // A shared `#item-{guideItemId}` link scrolls to its card once the cards are on screen.
  const highlightedId = useGuideItemHashTarget(shownIds);
  const total = guide.items.length;
  // The clear button disappears with the empty state, so focus moves to the toolbar.
  const filtersRef = useRef<HTMLElement>(null);

  let items;
  if (total === 0) {
    items = (
      <EmptyState
        title={m.guide_emptyState_title()}
        description={m.guide_emptyState_body()}
        actionLabel={m.guide_emptyState_action_label()}
        actionHref="/"
        parentTestId={GUIDE_PAGE_TEST_ID}
      />
    );
  } else if (placed.length === 0) {
    items = (
      <EmptyState
        icon={false}
        meta={m.guide_emptyState_filteredMeta({ total })}
        title={m.guide_emptyState_filteredTitle()}
        actionLabel={m.guide_emptyState_action_clearFiltersLabel()}
        actionVariant="primary"
        onAction={() => {
          setFilters(clearRestaurantFilters(filters));
          filtersRef.current?.focus();
        }}
        parentTestId={GUIDE_PAGE_TEST_ID}
      />
    );
  } else {
    items = (
      <ol
        className={styles.GuidePage__Items}
        aria-label={m.guide_items_ariaLabel()}
      >
        {placed.map(({ item, position }) => (
          <li key={item.id}>
            <RestaurantCard
              item={item}
              index={position}
              timeZone={guide.timeZone}
              layout={layout}
              clamp={needsClamp(item.description, layout)}
              share={guideItemShareTarget(guide, item)}
              highlighted={item.id === highlightedId}
              parentTestId={GUIDE_PAGE_TEST_ID}
            />
          </li>
        ))}
      </ol>
    );
  }

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
          {m.guide_backLink_label()}
        </ButtonLink>
      )}
      <GuideHeader
        guide={guide}
        layout={layout}
        share={guideShareTarget(guide)}
        className={styles.GuidePage__Top}
        parentTestId={GUIDE_PAGE_TEST_ID}
      />
      {total > 0 && (
        <GuideFilters
          ref={filtersRef}
          categories={categories}
          filters={filters}
          shown={placed.length}
          total={total}
          onChange={setFilters}
          layout={layout}
          parentTestId={GUIDE_PAGE_TEST_ID}
        />
      )}
      {items}
    </>
  );
}

/**
 * A Guide at `/guides/:guideId`: its header, the filter and sort toolbar and one card per
 * Guide Item shown (numbered in the editor's order), with loading, not-found, error, empty
 * and no-match states. The tab title is the socialTitle.
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
          title={m.guide_notFound_title()}
          description={m.guide_notFound_body()}
          parentTestId={GUIDE_PAGE_TEST_ID}
        />
      ) : (
        <ErrorPanel
          title={m.guide_errorPanel_title()}
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
