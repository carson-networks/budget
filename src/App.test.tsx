import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShellStore } from "./stores/shell/useShellStore.js";

vi.mock(import("./hooks/useCategories.js"), () => ({
  useAllCategories: vi.fn(),
}));

import { useAllCategories } from "./hooks/useCategories.js";
import App from "./App.js";

describe("App routes", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
    vi.mocked(useAllCategories).mockReturnValue({
      categories: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAllCategories>);
  });

  function renderApp(initialPath: string) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("serves the home page at / without redirecting", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { name: "Home", level: 2 }),
    ).toBeInTheDocument();
  });

  it("serves the categories list at /categories", () => {
    renderApp("/categories");
    expect(
      screen.getByRole("heading", { name: "Categories", level: 4 }),
    ).toBeInTheDocument();
  });
});
