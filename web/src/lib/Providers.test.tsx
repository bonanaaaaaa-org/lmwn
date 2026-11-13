import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import { Providers } from "@/lib/Providers";

function Greeting() {
  const { data } = useQuery({
    queryKey: ["greeting"],
    queryFn: () => Promise.resolve("hello"),
  });
  return <p>{data ?? "loading"}</p>;
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
});
