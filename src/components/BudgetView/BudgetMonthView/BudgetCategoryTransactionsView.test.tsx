import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";

vi.mock("../../../hooks/useCategories.js", () => ({
  useAllCategories: vi.fn(),
}));

vi.mock("./CategoryTransactions.js", () => ({
  CategoryTransactions: ({
    month,
    category,
    onNextMonth,
    onBack,
  }: {
    month: { year: number; month: number };
    category: Category;
    onNextMonth: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="category-transactions">
      {`${category.name} ${month.year}-${month.month}`}
      <button onClick={onNextMonth}>Next stub</button>
      <button onClick={onBack}>Back stub</button>
    </div>
  ),
}));

import { useAllCategories } from "../../../hooks/useCategories.js";
import BudgetCategoryTransactionsView from "./BudgetCategoryTransactionsView.js";

const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

function mockCategories(
  opts: { categories?: Category[]; isLoading?: boolean; error?: Error } = {},
) {
  vi.mocked(useAllCategories).mockReturnValue({
    categories: opts.categories ?? [groceries],
    isLoading: opts.isLoading ?? false,
    error: opts.error ?? null,
  } as ReturnType<typeof useAllCategories>);
}

function LocationDisplay() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function renderView(entry: string) {
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route
              path="budget/categories/:categoryId"
              element={<BudgetCategoryTransactionsView />}
            />
          </Routes>
          <LocationDisplay />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("BudgetCategoryTransactionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories();
  });

  it("shows the category named in the URL for the month in the URL", () => {
    renderView("/budget/categories/groceries?month=2025-03");
    expect(screen.getByTestId("category-transactions")).toHaveTextContent(
      "Groceries 2025-3",
    );
  });

  it("changes the month in the URL when stepping months", async () => {
    renderView("/budget/categories/groceries?month=2025-03");
    await userEvent.click(screen.getByRole("button", { name: "Next stub" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/budget/categories/groceries?month=2025-04",
    );
    expect(screen.getByTestId("category-transactions")).toHaveTextContent(
      "Groceries 2025-4",
    );
  });

  it("goes back to the month view on the same month", async () => {
    renderView("/budget/categories/groceries?month=2025-03");
    await userEvent.click(screen.getByRole("button", { name: "Back stub" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/budget?view=month&month=2025-03",
    );
  });

  it("explains when the category does not exist", () => {
    renderView("/budget/categories/missing?month=2025-03");
    expect(screen.getByText("Category not found")).toBeInTheDocument();
  });

  it("shows loading and error states", () => {
    mockCategories({ isLoading: true });
    const { unmount } = renderView("/budget/categories/groceries");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    unmount();

    mockCategories({ error: new Error("categories down") });
    renderView("/budget/categories/groceries");
    expect(screen.getByText("categories down")).toBeInTheDocument();
  });
});
