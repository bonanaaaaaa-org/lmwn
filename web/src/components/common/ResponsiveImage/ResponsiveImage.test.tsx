import { fireEvent, render, screen } from "@testing-library/react";

import { ResponsiveImage } from "./ResponsiveImage";

const sources = [
  { url: "http://images.test/cover-small.jpg", width: 480 },
  { url: "http://images.test/cover-large.jpg", width: 1200 },
];

describe("ResponsiveImage", () => {
  it("offers every source in srcset, lazily by default", () => {
    render(
      <ResponsiveImage
        sources={sources}
        alt="คาเฟ่ลับ"
        aspectRatio="16 / 9"
        sizes="50vw"
      />,
    );

    const img = screen.getByRole("img", { name: "คาเฟ่ลับ" });
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
        alt="ปก"
        aspectRatio="16 / 9"
        priority
      />,
    );

    const img = screen.getByRole("img", { name: "ปก" });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("swaps a failed image for a same-box placeholder that keeps the description", () => {
    const { container } = render(
      <ResponsiveImage sources={sources} alt="คาเฟ่ลับ" aspectRatio="4 / 3" />,
    );

    fireEvent.error(screen.getByRole("img", { name: "คาเฟ่ลับ" }));

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "คาเฟ่ลับ" })).toBe(
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
      <ResponsiveImage sources={sources} alt="คาเฟ่ลับ" aspectRatio="4 / 3" />,
    );
    const img = screen.getByRole("img", { name: "คาเฟ่ลับ" });
    Object.defineProperty(img, "naturalWidth", { value: 0 });

    fireEvent.load(img);

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("shows the placeholder straight away when there are no usable URLs", () => {
    const { container } = render(
      <ResponsiveImage
        sources={[{ url: "", width: 480 }]}
        alt="ไม่มีรูป"
        aspectRatio="1 / 1"
      />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "ไม่มีรูป" })).toBeInTheDocument();
  });

  it("hides a decorative placeholder from assistive tech", () => {
    render(<ResponsiveImage sources={[]} alt="" aspectRatio="1 / 1" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tries again when given new sources after a failure", () => {
    const { container, rerender } = render(
      <ResponsiveImage sources={sources} alt="รูป" aspectRatio="1 / 1" />,
    );
    fireEvent.error(screen.getByRole("img", { name: "รูป" }));

    rerender(
      <ResponsiveImage
        sources={[{ url: "http://images.test/other.jpg", width: 480 }]}
        alt="รูป"
        aspectRatio="1 / 1"
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "http://images.test/other.jpg",
    );
  });
});
