import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { useLocale } from "react-aria";

import { intlLocale } from "@/lib/locale";
import { Providers } from "@/lib/Providers";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

function Greeting() {
  const { data } = useQuery({
    queryKey: ["greeting"],
    queryFn: () => Promise.resolve("hello"),
  });
  return <p>{data ?? "loading"}</p>;
}

function LocaleProbe() {
  const { locale } = useLocale();
  return <p>{locale}</p>;
}

describe("Providers", () => {
  it("lets children run queries", async () => {
    render(
      <Providers>
        <Greeting />
      </Providers>,
    );

    expect(await screen.findByText("hello")).toBeInTheDocument();
  });

  it("sets React Aria's locale to the app locale", () => {
    render(
      <Providers>
        <LocaleProbe />
      </Providers>,
    );

    expect(screen.getByText(intlLocale)).toBeInTheDocument();
  });
});

describe("renderWithProviders", () => {
  it("gives tests the same React Aria locale and a query client", async () => {
    renderWithProviders(
      <>
        <LocaleProbe />
        <Greeting />
      </>,
    );

    expect(screen.getByText(intlLocale)).toBeInTheDocument();
    expect(await screen.findByText("hello")).toBeInTheDocument();
  });
});
