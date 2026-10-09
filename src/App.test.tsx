import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShellStore } from "./stores/shell/useShellStore.js";

vi.mock("./hooks/useCategories.js", () => ({
  useAllCategories: vi.fn(),
  useCreateCategory: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useUpdateCategory: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("./hooks/useBudgets.js", () => ({
  useBudgetsForRange: vi.fn(),
  useSetBudget: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("./hooks/useTransactionTotals.js", () => ({
  useTransactionTotalsForRange: vi.fn(),
}));

import { useAllCategories } from "./hooks/useCategories.js";
import { useBudgetsForRange } from "./hooks/useBudgets.js";
import { useTransactionTotalsForRange } from "./hooks/useTransactionTotals.js";
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
    vi.mocked(useBudgetsForRange).mockReturnValue({
      budgets: [],
      isLoading: false,
      isPlaceholderData: false,
      error: null,
    } as unknown as ReturnType<typeof useBudgetsForRange>);
    vi.mocked(useTransactionTotalsForRange).mockReturnValue({
      totals: { byMonth: [] },
      isLoading: false,
      isPlaceholderData: false,
      error: null,
    } as unknown as ReturnType<typeof useTransactionTotalsForRange>);
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

  it("serves the budget month view at /budget and can switch to the matrix", () => {
    renderApp("/budget");
    expect(
      screen.getByRole("heading", { name: "Budget", level: 4 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Month totals")).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Budget matrix" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Matrix" }));
    expect(
      screen.getByRole("table", { name: "Budget matrix" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Month totals")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Budget", level: 4 }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Month" }));
    expect(screen.getByText("Month totals")).toBeInTheDocument();
  });

  it("serves the categories list at /categories", () => {
    renderApp("/categories");
    expect(
      screen.getByRole("heading", { name: "Categories", level: 4 }),
    ).toBeInTheDocument();
  });
});
