import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-aria-components";
import { MemoryRouter, useNavigate } from "react-router";

import { ButtonLink } from "@/components/common/Button";
import { sampleTags } from "@/test-utils/fixtures/sampleContent";

import { isExternalHref, useRouterHref } from "./routerHref";

function AppLinks() {
  const navigate = useNavigate();
  return (
    <RouterProvider
      navigate={(to) => void navigate(to)}
      useHref={useRouterHref}
    >
      <ButtonLink href="tel:0939164541">call</ButtonLink>
      <ButtonLink href="https://www.wongnai.com/restaurants/x">
        wongnai
      </ButtonLink>
      <ButtonLink href={`/?tag=${sampleTags.cafe}`}>tag</ButtonLink>
    </RouterProvider>
  );
}

describe("useRouterHref", () => {
  it("leaves external links alone and resolves app paths, under the app's RouterProvider", () => {
    render(
      <MemoryRouter initialEntries={["/guides/e1bfd2d3"]}>
        <AppLinks />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "call" })).toHaveAttribute(
      "href",
      "tel:0939164541",
    );
    expect(screen.getByRole("link", { name: "wongnai" })).toHaveAttribute(
      "href",
      "https://www.wongnai.com/restaurants/x",
    );
    expect(
      screen.getByRole("link", { name: "tag" }).getAttribute("href"),
    ).toMatch(/^\/\?tag=/);
  });

  it.each([
    ["tel:0939164541", true],
    ["https://line.me/R/ti/p/%40x", true],
    ["//cdn.example.com/a", true],
    ["/guides/1", false],
    ["?tag=a", false],
  ])("isExternalHref(%s) is %s", (href, expected) => {
    expect(isExternalHref(href)).toBe(expected);
  });
});
