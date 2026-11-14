/** What narrows the Guide Index: search text and Tags (a Guide must have every Tag). */
export interface GuideIndexFilters {
  q: string;
  tags: string[];
}

export const NO_FILTERS: GuideIndexFilters = { q: "", tags: [] };

/** The gateway rejects longer search text (422), so the web app never sends it. */
export const MAX_SEARCH_LENGTH = 100;

const unique = (values: readonly string[]) => [...new Set(values)];

/** Search text as the gateway compares it: trimmed and NFC; whitespace only means no search. */
export function normaliseSearchText(text: string): string {
  return text.trim().normalize("NFC");
}

/** More than 100 characters (code points, like the gateway counts them) once trimmed. */
export function isSearchTextTooLong(text: string): boolean {
  return [...normaliseSearchText(text)].length > MAX_SEARCH_LENGTH;
}

/** Reads `?q=` and repeated `?tag=` from the URL; repeated and empty Tags are dropped. */
export function parseFilters(params: URLSearchParams): GuideIndexFilters {
  return {
    q: params.get("q") ?? "",
    tags: unique(params.getAll("tag").filter((tag) => tag !== "")),
  };
}

/** The query string for `filters`, `tag` repeated once per Tag (no leading `?`). */
export function toSearchParams(filters: GuideIndexFilters): URLSearchParams {
  const params = new URLSearchParams();
  const q = normaliseSearchText(filters.q);
  if (q) params.set("q", q);
  for (const tag of unique(filters.tags)) params.append("tag", tag);
  return params;
}

/** The Guide Index URL showing `filters`: `/`, or `/?q=…&tag=…&tag=…`. */
export function buildIndexHref(filters: GuideIndexFilters): string {
  const search = toSearchParams(filters).toString();
  return search ? `/?${search}` : "/";
}

/** The current filters plus one more Tag, for a Tag link on a card. */
export function addTag(
  filters: GuideIndexFilters,
  tag: string,
): GuideIndexFilters {
  return { q: filters.q, tags: unique([...filters.tags, tag]) };
}

/** Selects an unselected Tag or deselects a selected one. */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}
