import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { GuidePageSkeleton } from "./GuidePageSkeleton";

describe("GuidePageSkeleton", () => {
  it("announces one loading status for the whole page", () => {
    render(<GuidePageSkeleton parentTestId="guide" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      m.guide_skeleton_label(),
    );
    expect(screen.getByTestId("guide/skeleton")).toBeInTheDocument();
  });
});
