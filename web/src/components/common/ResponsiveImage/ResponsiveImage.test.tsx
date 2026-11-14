import { fireEvent, render, screen } from "@testing-library/react";

import { sampleImageAlts } from "@/test-utils/fixtures/sampleContent";

import { ResponsiveImage } from "./ResponsiveImage";

const sources = [
  { url: "http://images.test/cover-small.jpg", width: 480 },
  { url: "http://images.test/cover-large.jpg", width: 1200 },
];

describe("ResponsiveImage", () => {
  it("holds a deferred image's box and name without requesting it", () => {
    const { container } = render(
      <ResponsiveImage
        sources={sources}
        alt={sampleImageAlts.hiddenCafe}
        aspectRatio="16 / 9"
        deferred
      />,
    );

    expect(
      screen.getByRole("img", { name: sampleImageAlts.hiddenCafe }),
    ).toHaveAttribute("data-state", "deferred");
    expect(container.querySelector("img")).toBeNull();
  });

  it("offers every source in srcset, lazily by default", () => {
    render(
      <ResponsiveImage
        sources={sources}
        alt={sampleImageAlts.hiddenCafe}
        aspectRatio="16 / 9"
        sizes="50vw"
      />,
    );

    const img = screen.getByRole("img", { name: sampleImageAlts.hiddenCafe });
    expect(img).toHaveAttribute(
      "srcset",
      "http://images.test/cover-small.jpg 480w, http://images.test/cover-large.jpg 1200w",
    );
    expect(img).toHaveAttribute("sizes", "50vw");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("loads a priority image eagerly at high priority", () => {
    render(
      <ResponsiveImage
        sources={sources}
        alt={sampleImageAlts.cover}
        aspectRatio="16 / 9"
        priority
      />,
    );

    const img = screen.getByRole("img", { name: sampleImageAlts.cover });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("swaps a failed image for a same-box placeholder that keeps the description", () => {
    const { container } = render(
      <ResponsiveImage
        sources={sources}
        alt={sampleImageAlts.hiddenCafe}
        aspectRatio="4 / 3"
      />,
    );

    fireEvent.error(
      screen.getByRole("img", { name: sampleImageAlts.hiddenCafe }),
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: sampleImageAlts.hiddenCafe })).toBe(
      container.firstElementChild,
    );
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--image-aspect-ratio",
      ),
    ).toBe("4 / 3");
  });

  it("treats an image that loads with no pixels (empty body) as failed", () => {
    const { container } = render(
      <ResponsiveImage
        sources={sources}
        alt={sampleImageAlts.hiddenCafe}
        aspectRatio="4 / 3"
      />,
    );
    const img = screen.getByRole("img", { name: sampleImageAlts.hiddenCafe });
    Object.defineProperty(img, "naturalWidth", { value: 0 });

    fireEvent.load(img);

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("shows the placeholder straight away when there are no usable URLs", () => {
    const { container } = render(
      <ResponsiveImage
        sources={[{ url: "", width: 480 }]}
        alt={sampleImageAlts.noImage}
        aspectRatio="1 / 1"
      />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: sampleImageAlts.noImage }),
    ).toBeInTheDocument();
  });

  it("hides a decorative placeholder from assistive tech", () => {
    render(<ResponsiveImage sources={[]} alt="" aspectRatio="1 / 1" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tries again when given new sources after a failure", () => {
    const { container, rerender } = render(
      <ResponsiveImage
        sources={sources}
        alt={sampleImageAlts.photo}
        aspectRatio="1 / 1"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: sampleImageAlts.photo }));

    rerender(
      <ResponsiveImage
        sources={[{ url: "http://images.test/other.jpg", width: 480 }]}
        alt={sampleImageAlts.photo}
        aspectRatio="1 / 1"
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "http://images.test/other.jpg",
    );
  });
});
