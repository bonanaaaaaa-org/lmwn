import { render, screen } from "@testing-library/react";

import { Skeleton, SkeletonGroup } from "./Skeleton";

describe("SkeletonGroup", () => {
  it("announces one loading status and hides the shapes from assistive tech", () => {
    const { container } = render(
      <SkeletonGroup label="กำลังโหลดไกด์…">
        <Skeleton shape="text" lines={3} />
        <Skeleton aspectRatio="4 / 3" />
      </SkeletonGroup>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("กำลังโหลดไกด์…");
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});
