import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GUIDE_ID, makeGuide } from "@/features/guides/lib/fixtures";
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
  decorators: [withSeededGuide({ data: makeGuide() })],
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
