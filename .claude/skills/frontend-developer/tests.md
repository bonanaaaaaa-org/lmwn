# Good and Bad Tests (React / Vitest / Testing Library)

## Good Tests

**Integration-style**: test through rendered output and user interactions, not internal state.

```tsx
// GOOD: Tests observable behavior — what the user sees
test("shows the restaurant name and rating", () => {
  render(<RestaurantCard restaurant={mockRestaurant} />);
  expect(screen.getByRole("heading", { name: "ONIBUS COFFEE" })).toBeInTheDocument();
  expect(screen.getByText(/4\.3/)).toBeInTheDocument();
});

// GOOD: Tests user interaction → observable result
test("user can narrow the list to one category", async () => {
  const user = userEvent.setup();
  render(<GuideRestaurants restaurants={mockRestaurants} />);

  await user.click(screen.getByRole("button", { name: "Cafe" }));

  expect(screen.getAllByRole("article")).toHaveLength(2);
});

// GOOD: Tests hook through its return value
test("useRestaurantFilter matches name or category text", () => {
  const { result } = renderHook(() => useRestaurantFilter(mockRestaurants, "matcha"));
  expect(result.current.map((r) => r.name)).toEqual(["Matcha House"]);
});

// GOOD: Tests a schema — input → accepted/rejected
test("rejects a restaurant without a name", () => {
  const result = restaurantSchema.safeParse({ ...mockRestaurant, name: undefined });
  expect(result.success).toBe(false);
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public interface only (rendered output, hook returns, function results)
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: coupled to internal structure.

```tsx
// BAD: Tests internal state, not what user sees
test("sets loading state", () => {
  const { result } = renderHook(() => useGuidePage("id"));
  expect(result.current.internalState.phase).toBe("loading");
});

// BAD: Mocks an internal hook — breaks on refactor
test("calls useQuery with correct key", () => {
  const spy = vi.spyOn(tanstackQuery, "useQuery");
  render(<GuidePage guideId="id" />);
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["guides", "detail", "id"] }));
});

// BAD: Asserts on DOM structure, not behavior
test("renders three divs inside the card", () => {
  const { container } = render(<RestaurantCard restaurant={mockRestaurant} />);
  expect(container.querySelectorAll("div")).toHaveLength(3);
});

// BAD: Tests CSS class application
test("applies selected class", () => {
  render(<Tag variant="selected">Cafe</Tag>);
  expect(screen.getByText("Cafe")).toHaveClass("Tag__Root");
});
```

Red flags:

- Mocking internal hooks or stores
- Asserting on internal state (`internalState.phase`)
- Testing DOM structure instead of content/behavior
- Testing CSS class names (implementation details of CSS Modules)
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
