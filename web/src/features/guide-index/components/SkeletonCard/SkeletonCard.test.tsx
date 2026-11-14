import { render } from "@testing-library/react";

import { SkeletonCard } from "./SkeletonCard";

describe("SkeletonCard", () => {
  it("is hidden from assistive tech", () => {
    const { container } = render(<SkeletonCard />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
