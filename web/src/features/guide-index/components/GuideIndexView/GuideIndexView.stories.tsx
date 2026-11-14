import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { MAX_SEARCH_LENGTH } from "@/features/guide-index/lib/filters";
import type { GuideSummary } from "@/features/guide-index/lib/types";
import {
  guideIndexSearches as q,
  guideIndexTags as t,
  guideList,
  storyImage,
} from "@/test-utils/fixtures/guideIndex";
import { sampleThaiText } from "@/test-utils/fixtures/sampleContent";

import { GuideIndexView, type GuideIndexViewProps } from "./GuideIndexView";

/** The sample Guides with inline SVG covers, so stories stay off the network. */
const guides: GuideSummary[] = guideList.items.map((guide, index) => ({
  ...guide,
  coverPhoto: {
    ...guide.coverPhoto,
    smallUrl: storyImage(854, 534, `cover ${index + 1}`),
    largeUrl: storyImage(1920, 1200, `cover ${index + 1}`),
  },
}));
const [cafe, restaurant] = guides as [GuideSummary, GuideSummary];

const TAGS = [t.coffee, t.cafe, t.bangkok, t.one, t.bangkokLatin, t.restaurant];

const ready = (
  items: GuideSummary[],
  extra: Partial<
    Extract<GuideIndexViewProps["results"], { status: "ready" }>
  > = {},
): GuideIndexViewProps["results"] => ({
  status: "ready",
  guides: items,
  total: items.length,
  isUpdating: false,
  ...extra,
});

const meta = {
  title: "Features/GuideIndex/GuideIndexView",
  component: GuideIndexView,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    filters: { q: "", tags: [] },
    results: ready(guides),
    tags: TAGS,
    searchText: "",
    isSearchTooLong: false,
    layout: "desktop",
    onSearchTextChange: fn(),
    onSearchSubmit: fn(),
    onSearchClear: fn(),
    onTagsChange: fn(),
    onClearAll: fn(),
  },
} satisfies Meta<typeof GuideIndexView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every Guide, no filters (canvas "Main"). */
export const Default: Story = {};

export const Searched: Story = {
  args: {
    filters: { q: q.restaurant, tags: [] },
    searchText: q.restaurant,
    results: ready([restaurant]),
  },
};

export const TagSelected: Story = {
  args: {
    filters: { q: "", tags: [t.restaurant] },
    results: ready([restaurant]),
  },
};

/** First load: skeleton cards, announced once, and a placeholder row where the Tags will be. */
export const Loading: Story = {
  args: { results: { status: "loading" }, tags: [], tagsLoading: true },
};

/** A newer search is loading: the previous cards stay, dimmed and `aria-busy`. */
export const Updating: Story = {
  args: {
    filters: { q: q.hiddenCafe, tags: [] },
    searchText: q.hiddenCafe,
    results: ready(guides, { isUpdating: true }),
  },
};

export const Empty: Story = {
  args: {
    filters: { q: q.ramen, tags: [] },
    searchText: q.ramen,
    results: ready([]),
  },
};

export const EmptyTagsOnly: Story = {
  args: {
    filters: { q: "", tags: [t.coffee, t.restaurant] },
    results: ready([]),
  },
};

/** A search failed: the previous results stay, with an inline retry above them. */
export const SearchFailed: Story = {
  args: {
    filters: { q: q.hiddenCafe, tags: [] },
    searchText: q.hiddenCafe,
    results: ready([cafe], {
      error: { onRetry: fn(), isRetrying: false },
    }),
  },
};

/** Nothing loaded and the request failed after retries. */
export const LoadFailed: Story = {
  args: {
    results: { status: "error", onRetry: fn(), isRetrying: false },
  },
};

export const SearchTooLong: Story = {
  args: {
    searchText: sampleThaiText.consonant.repeat(MAX_SEARCH_LENGTH + 1),
    isSearchTooLong: true,
  },
};

/** Canvas "PhoneIndex": no lead, one scrolling row of Tags, phone cards. */
export const Phone: Story = {
  args: {
    layout: "phone",
    filters: { q: "", tags: [t.restaurant] },
    results: ready([restaurant]),
  },
  globals: { viewport: { value: "iphone12", isRotated: false } },
};

export const PhoneEmpty: Story = {
  args: {
    layout: "phone",
    filters: { q: q.ramen, tags: [] },
    searchText: q.ramen,
    results: ready([]),
  },
  globals: { viewport: { value: "iphone12", isRotated: false } },
};
