import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { expect, userEvent, within } from "storybook/test";

import { m } from "@/paraglide/messages.js";
import {
  GUIDE_ID,
  makeGuide,
  sampleCategories,
} from "@/test-utils/fixtures/guides";
import { guideKeys } from "@/features/guides/lib/queryKeys";
import type { Guide } from "@/features/guides/lib/types";
import { ApiError } from "@/lib/apiClient";

import { GuidePage } from "./GuidePage";

type Seed = { data: Guide } | { error: Error } | "loading";

/** Each story gets its own cache, seeded up front, so the page never calls the gateway. */
function withSeededGuide(seed: Seed): Decorator {
  return (Story) => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          retryOnMount: false,
          staleTime: Infinity,
          gcTime: Infinity,
        },
      },
    });
    const key = guideKeys.detail(GUIDE_ID);
    if (seed === "loading") {
      void client.prefetchQuery({
        queryKey: key,
        queryFn: () => new Promise<never>(() => {}),
      });
    } else if ("data" in seed) {
      client.setQueryData(key, seed.data);
    } else {
      client
        .getQueryCache()
        .build(client, { queryKey: key })
        .setState({ status: "error", error: seed.error, fetchStatus: "idle" });
    }
    return (
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    );
  };
}

const phone = { viewport: { value: "iphone14", isRotated: false } };

const meta = {
  title: "Features/Guides/GuidePage",
  component: GuidePage,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { guideId: GUIDE_ID },
  decorators: [
    withSeededGuide({ data: makeGuide() }),
    // The page reads the filters (search params) and shared `#item-` links (hash) from the
    // router; a story sets its query string with `parameters.search`.
    (Story, { parameters }) => (
      <MemoryRouter
        initialEntries={[
          `/guides/${GUIDE_ID}${String(parameters.search ?? "")}`,
        ]}
      >
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof GuidePage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Four Guide Items: rated, a second one, an Unavailable Restaurant and an Unrated one with a long write-up. */
export const Default: Story = {};
export const Phone: Story = { globals: phone };
export const Loading: Story = { decorators: [withSeededGuide("loading")] };
export const EmptyGuide: Story = {
  decorators: [withSeededGuide({ data: makeGuide({ items: [] }) })],
};
export const NotFound: Story = {
  decorators: [
    withSeededGuide({ error: new ApiError(404, "Guide not found") }),
  ],
};
export const LoadFailed: Story = {
  decorators: [
    withSeededGuide({ error: new ApiError(504, "Upstream timed out") }),
  ],
};

const coffeeAndDelivery = `?category=${encodeURIComponent(sampleCategories.coffee)}&delivery=1`;

/** Filtered from the URL: one Category and delivery; the Unavailable Restaurant is hidden. */
export const Filtered: Story = {
  parameters: { search: coffeeAndDelivery },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(m.guideFilters_count_body({ shown: 1, total: 4 })),
    ).toBeVisible();
  },
};

export const FilteredPhone: Story = {
  globals: phone,
  parameters: { search: coffeeAndDelivery },
};

/** Sorted by Rating: Unrated after the rated, the Unavailable Restaurant last; numbers keep guide order. */
export const SortedByRating: Story = { parameters: { search: "?sort=rating" } };

const noMatch = `?category=${encodeURIComponent(sampleCategories.fastFood)}&pickup=1&sort=rating`;

/** Nothing matches: the no-match panel offers to clear the filters (the sort stays). */
export const NoMatches: Story = {
  parameters: { search: noMatch },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: m.guide_emptyState_filteredTitle() }),
    ).toBeVisible();
  },
};

export const NoMatchesPhone: Story = {
  globals: phone,
  parameters: { search: noMatch },
};

/** Clearing from the no-match panel brings every card back. */
export const ClearFilters: Story = {
  parameters: { search: noMatch },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("guide/empty-state/action"));
    await expect(canvas.getAllByTestId("guide/restaurant-card")).toHaveLength(
      4,
    );
    await expect(
      canvas.getByTestId("guide/filters/sort-select/trigger"),
    ).toHaveTextContent(m.sortSelect_rating_label());
  },
};
