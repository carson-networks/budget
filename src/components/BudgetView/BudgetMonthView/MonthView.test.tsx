import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";

vi.mock("../../../hooks/useCategories.js", () => ({
  useAllCategories: vi.fn(),
}));

vi.mock("../../../hooks/useBudgets.js", () => ({
  useBudgetsForRange: vi.fn(),
  useSetBudget: vi.fn(),
}));

vi.mock("../../../hooks/useTransactionTotals.js", () => ({
  useTransactionTotalsForRange: vi.fn(),
}));

vi.mock("./CategoryTransactions.js", () => ({
  CategoryTransactions: ({
    month,
    category,
    onBack,
  }: {
    month: { year: number; month: number };
    category: Category;
    onBack: () => void;
  }) => (
    <div data-testid="category-transactions">
      {`${category.name} ${month.year}-${month.month}`}
      <button onClick={onBack}>Back stub</button>
    </div>
  ),
}));

import { useAllCategories } from "../../../hooks/useCategories.js";
import { useBudgetsForRange, useSetBudget } from "../../../hooks/useBudgets.js";
import { useTransactionTotalsForRange } from "../../../hooks/useTransactionTotals.js";
import BudgetMonthView from "./MonthView.js";

const foodParent: Category = {
  id: "food",
  name: "Food",
  isParent: true,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  parentCategoryId: "food",
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

const salary: Category = {
  id: "salary",
  name: "Salary",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Income,
};

function mockMonthData(opts?: {
  categories?: Category[];
  budgets?: ReturnType<typeof useBudgetsForRange>["budgets"];
  totals?: ReturnType<typeof useTransactionTotalsForRange>["totals"];
  loading?: boolean;
  error?: Error | null;
}) {
  vi.mocked(useAllCategories).mockReturnValue({
    categories: opts?.categories ?? [foodParent, groceries, salary],
    isLoading: opts?.loading ?? false,
    error: null,
  } as ReturnType<typeof useAllCategories>);

  vi.mocked(useBudgetsForRange).mockReturnValue({
    budgets: opts?.budgets ?? [
      { categoryId: "groceries", year: 2025, month: 3, amount: "400" },
      { categoryId: "salary", year: 2025, month: 3, amount: "5000" },
    ],
    isLoading: opts?.loading ?? false,
    isPlaceholderData: false,
    error: opts?.error ?? null,
  } as ReturnType<typeof useBudgetsForRange>);

  vi.mocked(useTransactionTotalsForRange).mockReturnValue({
    totals: opts?.totals ?? {
      byMonth: [
        {
          year: 2025,
          month: 3,
          byCategory: [
            { categoryId: "groceries", total: "-320.00" },
            { categoryId: "salary", total: "5000.00" },
          ],
        },
      ],
    },
    isLoading: opts?.loading ?? false,
    isPlaceholderData: false,
    error: null,
  } as ReturnType<typeof useTransactionTotalsForRange>);

  vi.mocked(useSetBudget).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    variables: undefined,
  } as unknown as ReturnType<typeof useSetBudget>);
}

function renderMonthView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BudgetMonthView />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("BudgetMonthView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15));
    mockMonthData();
  });

  it("renders the selected month, category rows, and month totals", () => {
    renderMonthView();

    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Month options" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getAllByText("Difference").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Month totals")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Net" })).toBeInTheDocument();
    // Parent categories are not editable; leaf rows expose budget inputs.
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("keeps the month options control when navigating to a past month", () => {
    renderMonthView();

    expect(
      screen.getByRole("button", { name: "Month options" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    expect(screen.getByText("Feb 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Month options" }),
    ).toBeInTheDocument();
  });

  it("shows loading and error states", () => {
    mockMonthData({ loading: true });
    const { unmount } = renderMonthView();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    unmount();

    mockMonthData({ error: new Error("budgets down") });
    renderMonthView();
    expect(screen.getByText("budgets down")).toBeInTheDocument();
  });
  it("opens a category's transactions in place of the budget tables and goes back", () => {
    renderMonthView();
    fireEvent.click(
      screen.getByRole("button", { name: "Open Groceries transactions" }),
    );

    expect(screen.getByTestId("category-transactions")).toHaveTextContent(
      "Groceries 2025-3",
    );
    expect(screen.queryByText("Month totals")).not.toBeInTheDocument();
    expect(screen.getByText("Mar 2025")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back stub" }));
    expect(
      screen.queryByTestId("category-transactions"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Month totals")).toBeInTheDocument();
  });

  it("keeps the open category when changing months", () => {
    renderMonthView();
    fireEvent.click(
      screen.getByRole("button", { name: "Open Salary transactions" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByTestId("category-transactions")).toHaveTextContent(
      "Salary 2025-4",
    );
  });
});
