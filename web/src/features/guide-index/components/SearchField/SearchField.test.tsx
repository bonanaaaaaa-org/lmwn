import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { MAX_SEARCH_LENGTH } from "@/features/guide-index/lib/filters";
import { m } from "@/paraglide/messages.js";
import { guideIndexSearches as q } from "@/test-utils/fixtures/guideIndex";

import { SearchField, type SearchFieldProps } from "./SearchField";

const tooLongMessage = () =>
  m.guideIndex_search_tooLongMessage({ max: MAX_SEARCH_LENGTH });

function Controlled(props: Partial<SearchFieldProps>) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <SearchField
      parentTestId="page"
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
    />
  );
}

describe("SearchField", () => {
  it("is a labelled searchbox inside a search landmark", () => {
    render(<Controlled />);

    const input = screen.getByRole("searchbox", {
      name: m.searchField_label(),
    });
    expect(input).toHaveAttribute(
      "placeholder",
      m.searchField_input_placeholder(),
    );
    expect(screen.getByRole("search")).toContainElement(input);
    expect(screen.getByTestId("page/search")).toBe(screen.getByRole("search"));
    expect(screen.getByTestId("page/search/input")).toBe(input);
  });

  it("reports every change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.type(screen.getByRole("searchbox"), q.cafePrefix);

    expect(onChange).toHaveBeenLastCalledWith(q.cafePrefix);
  });

  it("submits on Enter without reloading the page", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Controlled value={q.cafe} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("searchbox"), "{Enter}");

    expect(onSubmit).toHaveBeenCalledWith(q.cafe);
  });

  it("shows the clear button only when there is text, and clears", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Controlled onClear={onClear} />);

    expect(screen.queryByTestId("page/search/clear")).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), q.cafe);
    await user.click(
      screen.getByRole("button", { name: m.searchField_clear_ariaLabel() }),
    );

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByTestId("page/search/clear")).not.toBeInTheDocument();
  });

  it("marks the field invalid and describes why", () => {
    render(<Controlled isInvalid errorMessage={tooLongMessage()} />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(tooLongMessage());
  });
});
