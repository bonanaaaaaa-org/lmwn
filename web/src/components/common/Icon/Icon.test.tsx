import { render } from "@testing-library/react";

import { Icon } from "./Icon";

describe("Icon", () => {
  it("is decorative and sized on the 24 grid", () => {
    const { container } = render(<Icon name="phone" size={18} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("data-icon", "phone");
  });
});
