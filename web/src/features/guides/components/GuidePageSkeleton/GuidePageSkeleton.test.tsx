import { render, screen } from "@testing-library/react";

import { GuidePageSkeleton } from "./GuidePageSkeleton";

describe("GuidePageSkeleton", () => {
  it("announces one loading status for the whole page", () => {
    render(<GuidePageSkeleton parentTestId="guide" />);
    expect(screen.getByRole("status")).toHaveTextContent("กำลังโหลดไกด์…");
    expect(screen.getByTestId("guide/skeleton")).toBeInTheDocument();
  });
});
