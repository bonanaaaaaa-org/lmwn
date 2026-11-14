import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SearchField, type SearchFieldProps } from "./SearchField";

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

    const input = screen.getByRole("searchbox", { name: "ค้นหาไกด์" });
    expect(input).toHaveAttribute(
      "placeholder",
      "ชื่อไกด์ คำอธิบาย หรือแท็ก เช่น คาเฟ่",
    );
    expect(screen.getByRole("search")).toContainElement(input);
    expect(screen.getByTestId("page/search")).toBe(screen.getByRole("search"));
    expect(screen.getByTestId("page/search/input")).toBe(input);
  });

  it("reports every change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.type(screen.getByRole("searchbox"), "คา");

    expect(onChange).toHaveBeenLastCalledWith("คา");
  });

  it("submits on Enter without reloading the page", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Controlled value="คาเฟ่" onSubmit={onSubmit} />);

    await user.type(screen.getByRole("searchbox"), "{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("คาเฟ่");
  });

  it("shows the clear button only when there is text, and clears", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Controlled onClear={onClear} />);

    expect(screen.queryByTestId("page/search/clear")).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "คาเฟ่");
    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByTestId("page/search/clear")).not.toBeInTheDocument();
  });

  it("marks the field invalid and describes why", () => {
    render(<Controlled isInvalid errorMessage="คำค้นหายาวเกิน 100 ตัวอักษร" />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("คำค้นหายาวเกิน 100 ตัวอักษร");
  });
});
