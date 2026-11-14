import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { guideList } from "@/features/guide-index/lib/fixtures";
import { storyImage } from "@/features/guide-index/lib/storyImages";
import type { GuideSummary } from "@/features/guide-index/lib/types";

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

const TAGS = ["กาแฟ", "คาเฟ่", "กรุงเทพ", "One", "Bangkok", "ร้านอาหาร"];

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
    filters: { q: "ร้านอาหาร", tags: [] },
    searchText: "ร้านอาหาร",
    results: ready([restaurant]),
  },
};

export const TagSelected: Story = {
  args: {
    filters: { q: "", tags: ["ร้านอาหาร"] },
    results: ready([restaurant]),
  },
};

/** First load: skeleton cards, announced once. */
export const Loading: Story = { args: { results: { status: "loading" } } };

/** A newer search is loading: the previous cards stay, dimmed and `aria-busy`. */
export const Updating: Story = {
  args: {
    filters: { q: "คาเฟ่ลับ", tags: [] },
    searchText: "คาเฟ่ลับ",
    results: ready(guides, { isUpdating: true }),
  },
};

export const Empty: Story = {
  args: {
    filters: { q: "ราเมน", tags: [] },
    searchText: "ราเมน",
    results: ready([]),
  },
};

export const EmptyTagsOnly: Story = {
  args: {
    filters: { q: "", tags: ["กาแฟ", "ร้านอาหาร"] },
    results: ready([]),
  },
};

/** A search failed: the previous results stay, with an inline retry above them. */
export const SearchFailed: Story = {
  args: {
    filters: { q: "คาเฟ่ลับ", tags: [] },
    searchText: "คาเฟ่ลับ",
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
  args: { searchText: "ก".repeat(101), isSearchTooLong: true },
};

/** Canvas "PhoneIndex": no lead, one scrolling row of Tags, phone cards. */
export const Phone: Story = {
  args: {
    layout: "phone",
    filters: { q: "", tags: ["ร้านอาหาร"] },
    results: ready([restaurant]),
  },
  globals: { viewport: { value: "iphone12", isRotated: false } },
};

export const PhoneEmpty: Story = {
  args: {
    layout: "phone",
    filters: { q: "ราเมน", tags: [] },
    searchText: "ราเมน",
    results: ready([]),
  },
  globals: { viewport: { value: "iphone12", isRotated: false } },
};
