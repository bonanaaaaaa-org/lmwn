# When to Mock (React / Vitest)

Mock at **system boundaries** only — things you don't control or that have side effects outside the test.

## Mock these (system boundaries)

| Boundary | How | Example |
|---|---|---|
| API gateway | msw request handlers (preferred), or `vi.mock` on the API client module | ``http.get(`${env.apiBaseUrl}/guides/:id`, () => HttpResponse.json(mockGuide))`` |
| Browser APIs | `vi.stubGlobal` / `Object.defineProperty` | `navigator.share`, `navigator.clipboard`, `matchMedia` |
| Time | `vi.useFakeTimers()` + `vi.setSystemTime()` | "open now", debounce |
| Randomness | `vi.spyOn(Math, "random")` | ID generation in tests |

## Don't mock these (your own code)

| Don't mock | Why |
|---|---|
| Internal hooks (`useGuide`, `useRestaurantFilter`) | They're part of the behavior under test; mocking hides real bugs |
| TanStack Query internals | Test through the component that uses the hook, with a real `QueryClientProvider` |
| Context providers | Wrap in a real provider with test data instead |
| Utility functions (`formatPhone`, `clsx`) | Pure functions — let them run |
| Child components | Render the real component; mock boundaries, not siblings |

## Designing for Mockability

**1. The network as the boundary**

msw intercepts `fetch`, so the real API client, Zod parsing and hooks all run. Override a handler per test for error and edge cases:

```ts
server.use(
  http.get(`${env.apiBaseUrl}/guides/:id`, () =>
    HttpResponse.json({ detail: "Guide not found" }, { status: 404 }),
  ),
);
```

Render with `renderWithProviders` from `@/test-utils/renderWithProviders` — a fresh `QueryClient` per test with `retry: false`, so error states show immediately, plus React Aria's `I18nProvider` (`th-TH`). Gateway-shaped data comes from `@/test-utils/fixtures/guides` (`makeGuide`, `toGatewayJson`). The shared msw server lives in `@/test-utils/server`; unhandled requests fail the test.

**2. Don't mock to avoid rendering**

If a child component is expensive to render, test it separately — don't mock it out of the parent's test. Mock the _boundary_ (network) and let the component tree render naturally.

**3. One adapter = no seam needed**

If you only have one implementation of something (e.g., one date formatter), don't create an injectable interface just for testing. Let the real code run. Only introduce a seam when there are genuinely two implementations (production + test).
