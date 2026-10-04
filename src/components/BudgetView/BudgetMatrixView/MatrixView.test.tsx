import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("./useBudgetMatrixMonthWindow.js", () => ({
  useBudgetMatrixMonthWindow: () => ({
    nowYm: { year: 2025, month: 3 },
    months: [
      { year: 2025, month: 2 },
      { year: 2025, month: 3 },
      { year: 2025, month: 4 },
    ],
    currentMonthIndex: 1,
    setRangeStart: vi.fn(),
    setRangeEnd: vi.fn(),
  }),
}));

import { useAllCategories } from "../../../hooks/useCategories.js";
import { useBudgetsForRange, useSetBudget } from "../../../hooks/useBudgets.js";
import { useTransactionTotalsForRange } from "../../../hooks/useTransactionTotals.js";
import BudgetMatrixView from "./MatrixView.js";

const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  parentCategoryId: "food",
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};
const categories: Category[] = [
  {
    ...groceries,
    id: "food",
    name: "Food",
    isParent: true,
    parentCategoryId: undefined,
  },
  groceries,
  {
    ...groceries,
    id: "salary",
    name: "Salary",
    categoryKind: CategoryKind.Income,
    parentCategoryId: undefined,
  },
  { ...groceries, id: "disabled", name: "Disabled", isDisabled: true },
];
const mutateAsync = vi.fn();

function mockData(
  options: {
    loading?: boolean;
    categoriesError?: Error;
    budgetsError?: Error;
    totalsError?: Error;
    refreshing?: boolean;
    empty?: boolean;
  } = {},
) {
  vi.mocked(useAllCategories).mockReturnValue({
    categories: options.empty ? [] : categories,
    isLoading: options.loading ?? false,
    error: options.categoriesError ?? null,
  } as ReturnType<typeof useAllCategories>);
  vi.mocked(useBudgetsForRange).mockReturnValue({
    budgets: [
      { categoryId: "groceries", year: 2025, month: 2, amount: "400" },
      { categoryId: "salary", year: 2025, month: 2, amount: "5000" },
    ],
    isLoading: options.loading ?? false,
    error: options.budgetsError ?? null,
    isPlaceholderData: options.refreshing ?? false,
  } as ReturnType<typeof useBudgetsForRange>);
  vi.mocked(useTransactionTotalsForRange).mockReturnValue({
    totals: {
      byMonth: [
        {
          year: 2025,
          month: 3,
          byCategory: [
            { categoryId: "groceries", total: "-320" },
            { categoryId: "salary", total: "5100" },
          ],
        },
      ],
    },
    isLoading: options.loading ?? false,
    error: options.totalsError ?? null,
    isPlaceholderData: options.refreshing ?? false,
  } as ReturnType<typeof useTransactionTotalsForRange>);
  vi.mocked(useSetBudget).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useSetBudget>);
}

function renderMatrix() {
  return render(
    <MantineProvider theme={theme}>
      <BudgetMatrixView />
    </MantineProvider>,
  );
}

function rowCells(name: string) {
  return within(
    screen.getByRole("rowheader", { name }).closest("tr")!,
  ).getAllByRole("cell");
}

describe("BudgetMatrixView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue(undefined);
    mockData();
  });

  it("renders grouped categories, budgets, and totals for the queried range", () => {
    renderMatrix();
    expect(useBudgetsForRange).toHaveBeenCalledWith(
      { year: 2025, month: 2 },
      { year: 2025, month: 4 },
    );
    expect(useTransactionTotalsForRange).toHaveBeenCalledWith(
      { year: 2025, month: 2 },
      { year: 2025, month: 4 },
    );
    expect(
      screen.getByRole("columnheader", { name: "Mar 2025" }),
    ).toHaveAttribute("data-current", "true");
    expect(
      screen.getByRole("textbox", { name: "Groceries budget for Mar 2025" }),
    ).toHaveValue("$400");
    expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /Food budget/ }),
    ).not.toBeInTheDocument();
    expect(rowCells("Total").map((cell) => cell.textContent)).toEqual([
      "$4,600",
      "$4,600",
      "$4,600",
    ]);
  });

  it("switches to actual and net values with read-only cells and matching totals", () => {
    renderMatrix();
    fireEvent.click(screen.getByRole("button", { name: "Actual" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(rowCells("Groceries").map((cell) => cell.textContent)).toEqual([
      "—",
      "-$320",
      "—",
    ]);
    expect(rowCells("Total")[1]).toHaveTextContent("$4,780");
    fireEvent.click(screen.getByRole("button", { name: "Net" }));
    expect(rowCells("Groceries")[1]).toHaveTextContent("$80");
    expect(rowCells("Salary Income")[1]).toHaveTextContent("$100");
    expect(rowCells("Total")[1]).toHaveTextContent("$180");
    fireEvent.click(screen.getByRole("button", { name: "Budgeted" }));
    expect(
      screen.getByRole("textbox", { name: "Groceries budget for Mar 2025" }),
    ).toBeInTheDocument();
  });

  it("saves a budget for the selected cell with future propagation disabled by default", async () => {
    const user = userEvent.setup();
    renderMatrix();
    const input = screen.getByRole("textbox", {
      name: "Groceries budget for Mar 2025",
    });
    await user.clear(input);
    await user.type(input, "450{Enter}");
    expect(mutateAsync).toHaveBeenCalledWith({
      categoryId: "groceries",
      year: 2025,
      month: 3,
      amount: "450",
      overwriteFutureMonths: false,
    });
  });

  it("applies to every following month when checked, including edits to past months", async () => {
    const user = userEvent.setup();
    renderMatrix();
    await user.click(
      screen.getByRole("checkbox", { name: "Apply changes to future months" }),
    );
    for (const [month, label, propagate] of [
      [2, "Feb", true],
      [3, "Mar", true],
      [4, "Apr", true],
    ] as const) {
      const input = screen.getByRole("textbox", {
        name: `Groceries budget for ${label} 2025`,
      });
      await user.clear(input);
      await user.type(input, "450{Enter}");
      expect(mutateAsync).toHaveBeenLastCalledWith({
        categoryId: "groceries",
        year: 2025,
        month,
        amount: "450",
        overwriteFutureMonths: propagate,
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Actual" }));
    fireEvent.click(screen.getByRole("button", { name: "Budgeted" }));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("reverts a failed save", async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error("save failed"));
    renderMatrix();
    const input = screen.getByRole("textbox", {
      name: "Groceries budget for Mar 2025",
    });
    await user.clear(input);
    await user.type(input, "450{Enter}");
    expect(input).toHaveValue("$400");
  });

  it("keeps the matrix visible and prevents edits while range data is stale", () => {
    mockData({ refreshing: true });
    renderMatrix();
    expect(
      screen.getByRole("table", { name: "Budget matrix" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("textbox", { name: "Groceries budget for Mar 2025" }),
    ).toBeDisabled();
  });

  it.each(["categoriesError", "budgetsError", "totalsError"] as const)(
    "reports %s",
    (source) => {
      mockData({ [source]: new Error("service unavailable") });
      renderMatrix();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "service unavailable",
      );
    },
  );

  it("shows initial loading and an empty-category message", () => {
    mockData({ loading: true });
    const { unmount } = renderMatrix();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    unmount();
    mockData({ empty: true });
    renderMatrix();
    expect(screen.getByText("No categories yet.")).toBeInTheDocument();
  });

  it("restores the current-month position when the table remounts after a query error", () => {
    const { rerender } = renderMatrix();
    expect(
      screen.getByRole("region", { name: "Budget matrix months" }).scrollLeft,
    ).toBe(100);
    mockData({ budgetsError: new Error("temporarily unavailable") });
    rerender(
      <MantineProvider theme={theme}>
        <BudgetMatrixView />
      </MantineProvider>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    mockData();
    rerender(
      <MantineProvider theme={theme}>
        <BudgetMatrixView />
      </MantineProvider>,
    );
    expect(
      screen.getByRole("region", { name: "Budget matrix months" }).scrollLeft,
    ).toBe(100);
  });
});
