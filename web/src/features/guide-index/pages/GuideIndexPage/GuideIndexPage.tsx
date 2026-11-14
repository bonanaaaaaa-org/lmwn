import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import {
  GuideIndexView,
  type GuideIndexResults,
} from "@/features/guide-index/components/GuideIndexView";
import {
  buildIndexHref,
  isSearchTextTooLong,
  NO_FILTERS,
  normaliseSearchText,
  parseFilters,
  type GuideIndexFilters,
} from "@/features/guide-index/lib/filters";
import { guideIndexApi } from "@/features/guide-index/lib/guideIndexApi";
import { guideIndexKeys } from "@/features/guide-index/lib/queryKeys";
import type { GuideList } from "@/features/guide-index/lib/types";
import { useIsPhone } from "@/hooks/useMediaQuery";

/** Typing commits to the URL this long after the last keystroke. */
export const SEARCH_DEBOUNCE_MS = 300;

const guideListQuery = (filters: GuideIndexFilters) => ({
  queryKey: guideIndexKeys.list(filters),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    guideIndexApi.list(filters, signal),
});

/** Every Tag across all Guides in first-seen order, plus selected Tags no Guide has. */
function tagUniverse(
  all: GuideList | undefined,
  selected: readonly string[],
): string[] {
  const tags = new Set(all?.items.flatMap((guide) => guide.tags));
  for (const tag of selected) tags.add(tag);
  return [...tags];
}

/**
 * The Guide Index (`/`). Search text and Tags live in the URL (`?q=…&tag=…&tag=…`), so
 * reload, share and Back restore the view. Typing commits 300 ms after the last keystroke
 * (pushing when it starts a search, replacing while refining it), Enter commits at once and
 * Tags toggle immediately (history push).
 */
export function GuideIndexPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  // Over-long text in a shared URL is shown as invalid and never sent.
  const applied: GuideIndexFilters = isSearchTextTooLong(filters.q)
    ? { q: "", tags: filters.tags }
    : filters;

  // The search box runs ahead of the URL while typing; when the URL's q changes from
  // elsewhere (Back, a Tag link, clear all), the box follows it.
  const [searchText, setSearchText] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    if (normaliseSearchText(searchText) !== normaliseSearchText(filters.q)) {
      setSearchText(filters.q);
    }
  }

  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  });
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounce.current), []);

  const commit = useCallback(
    (next: GuideIndexFilters, { replace }: { replace: boolean }) => {
      clearTimeout(debounce.current);
      const href = buildIndexHref(next);
      if (href === buildIndexHref(latestFilters.current)) return;
      void navigate(href, { replace, preventScrollReset: true });
    },
    [navigate],
  );

  const isSearchTooLong = isSearchTextTooLong(searchText);
  /** The text to keep when Tags change: what's typed, unless it can't be sent. */
  const sendableText = isSearchTooLong ? applied.q : searchText;

  const list = useQuery({
    ...guideListQuery(applied),
    placeholderData: keepPreviousData,
  });
  // Same key as the unfiltered view, so the default list and the Tag universe share a request.
  const all = useQuery(guideListQuery(NO_FILTERS));

  // The last results that really loaded. TanStack drops placeholder data once a query
  // fails, so a failed search falls back to these instead of blanking the list.
  const [lastLoaded, setLastLoaded] = useState<GuideList>();
  if (list.isSuccess && !list.isPlaceholderData && list.data !== lastLoaded) {
    setLastLoaded(list.data);
  }
  const shown = list.data ?? lastLoaded;
  const retry = {
    onRetry: () => void list.refetch(),
    isRetrying: list.isFetching,
  };

  let results: GuideIndexResults;
  if (shown) {
    results = {
      status: "ready",
      guides: shown.items,
      total: shown.total,
      // A newer search is loading behind the results on screen.
      isUpdating:
        list.isFetching && (list.isPlaceholderData || list.data === undefined),
      error: list.isError ? retry : undefined,
    };
  } else if (list.isError) {
    results = { status: "error", ...retry };
  } else {
    results = { status: "loading" };
  }

  return (
    <GuideIndexView
      filters={filters}
      results={results}
      tags={tagUniverse(all.data, filters.tags)}
      searchText={searchText}
      isSearchTooLong={isSearchTooLong}
      onSearchTextChange={(text) => {
        setSearchText(text);
        clearTimeout(debounce.current);
        if (isSearchTextTooLong(text)) return;
        debounce.current = setTimeout(() => {
          const current = latestFilters.current;
          // Starting a search pushes, so Back returns to the view before it; refining
          // the text (or clearing it) replaces, so each pause doesn't add an entry.
          commit(
            { q: text, tags: current.tags },
            { replace: normaliseSearchText(current.q) !== "" },
          );
        }, SEARCH_DEBOUNCE_MS);
      }}
      onSearchSubmit={(text) => {
        if (isSearchTextTooLong(text)) {
          clearTimeout(debounce.current);
          return;
        }
        commit({ q: text, tags: filters.tags }, { replace: false });
      }}
      onSearchClear={() => {
        setSearchText("");
        commit({ q: "", tags: filters.tags }, { replace: false });
      }}
      onTagsChange={(tags) =>
        commit({ q: sendableText, tags }, { replace: false })
      }
      onClearAll={() => {
        setSearchText("");
        commit(NO_FILTERS, { replace: false });
      }}
      layout={isPhone ? "phone" : "desktop"}
    />
  );
}
