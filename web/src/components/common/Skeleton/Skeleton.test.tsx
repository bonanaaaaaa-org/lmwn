import { render, screen } from "@testing-library/react";

import { m } from "@/paraglide/messages.js";

import { Skeleton, SkeletonGroup } from "./Skeleton";

describe("SkeletonGroup", () => {
  it("announces one loading status and hides the shapes from assistive tech", () => {
    const { container } = render(
      <SkeletonGroup label={m.guide_skeleton_label()}>
        <Skeleton shape="text" lines={3} />
        <Skeleton aspectRatio="4 / 3" />
      </SkeletonGroup>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(m.guide_skeleton_label());
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it("announces a generic loading label by default", () => {
    render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      m.skeletonGroup_label(),
    );
  });
});
