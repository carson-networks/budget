import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import { wireCategory } from "../../../test/wire.js";
import BudgetMatrixView from "./MatrixView.js";

const api = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listBudgets: vi.fn(),
  setBudget: vi.fn(),
  getTransactionTotals: vi.fn(),
}));
vi.mock("../../../connectRPC/connect.js", () => ({
  categoryClient: { listCategories: api.listCategories },
  budgetClient: { listBudgets: api.listBudgets, setBudget: api.setBudget },
  transactionClient: { getTransactionTotals: api.getTransactionTotals },
}));

const windowState = vi.hoisted(() => ({
  months: [] as { year: number; month: number }[],
}));
vi.mock("./useBudgetMatrixMonthWindow.js", () => ({
  useBudgetMatrixMonthWindow: () => ({
    nowYm: { year: 2025, month: 3 },
    months: windowState.months,
    currentMonthIndex: windowState.months.findIndex(
      (m) => m.year === 2025 && m.month === 3,
    ),
    setRangeStart: vi.fn(),
    setRangeEnd: vi.fn(),
  }),
}));

const FEB_TO_APR = [
  { year: 2025, month: 2 },
  { year: 2025, month: 3 },
  { year: 2025, month: 4 },
];

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

function mockData(
  options: {
    loading?: boolean;
    categoriesError?: Error;
    budgetsError?: Error;
    totalsError?: Error;
    empty?: boolean;
  } = {},
) {
  const never = () => new Promise(() => {});
  const respond = (error: Error | undefined, value: unknown) =>
    options.loading
      ? never()
      : error
        ? Promise.reject(error)
        : Promise.resolve(value);
  api.listCategories.mockImplementation(() =>
    respond(options.categoriesError, {
      categories: (options.empty ? [] : categories).map(wireCategory),
    }),
  );
  api.listBudgets.mockImplementation(() =>
    respond(options.budgetsError, {
      budgets: [
        { categoryId: "groceries", year: 2025, month: 2, amount: "400" },
        { categoryId: "salary", year: 2025, month: 2, amount: "5000" },
      ],
    }),
  );
  api.getTransactionTotals.mockImplementation(() =>
    respond(options.totalsError, {
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
    }),
  );
}

async function renderMatrix() {
  const view = renderWithProviders(<BudgetMatrixView />);
  await screen.findByRole("table", { name: "Budget matrix" });
  return view;
}

function rowCells(name: string) {
  return within(
    screen.getByRole("rowheader", { name }).closest("tr")!,
  ).getAllByRole("cell");
}

describe("BudgetMatrixView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    windowState.months = FEB_TO_APR;
    api.setBudget.mockResolvedValue({});
    mockData();
  });

  it("renders grouped categories, budgets, and totals for the queried range", async () => {
    await renderMatrix();
    const range = { startMonth: 2, startYear: 2025, endMonth: 4, endYear: 2025 };
    expect(api.listBudgets).toHaveBeenCalledWith(range);
    expect(api.getTransactionTotals).toHaveBeenCalledWith(range);
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

  it("switches to actual and net values with read-only cells and matching totals", async () => {
    await renderMatrix();
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
    await renderMatrix();
    const input = screen.getByRole("textbox", {
      name: "Groceries budget for Mar 2025",
    });
    await user.clear(input);
    await user.type(input, "450{Enter}");
    await waitFor(() =>
      expect(api.setBudget).toHaveBeenCalledWith({
        categoryId: "groceries",
        year: 2025,
        month: 3,
        amount: "450",
        overwriteFutureMonths: false,
      }),
    );
  });

  it("applies to every following month when checked, including edits to past months", async () => {
    const user = userEvent.setup();
    await renderMatrix();
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
      await waitFor(() =>
        expect(api.setBudget).toHaveBeenLastCalledWith({
          categoryId: "groceries",
          year: 2025,
          month,
          amount: "450",
          overwriteFutureMonths: propagate,
        }),
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Actual" }));
    fireEvent.click(screen.getByRole("button", { name: "Budgeted" }));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("reverts a failed save", async () => {
    const user = userEvent.setup();
    api.setBudget.mockRejectedValue(new Error("save failed"));
    await renderMatrix();
    const input = screen.getByRole("textbox", {
      name: "Groceries budget for Mar 2025",
    });
    await user.clear(input);
    await user.type(input, "450{Enter}");
    await waitFor(() => expect(api.setBudget).toHaveBeenCalled());
    await waitFor(() => expect(input).toHaveValue("$400"));
  });

  it("only disables the matching category and month while saving", async () => {
    const user = userEvent.setup();
    let finishSave!: () => void;
    api.setBudget.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
    );
    await renderMatrix();
    const march = screen.getByRole("textbox", {
      name: "Groceries budget for Mar 2025",
    });
    await user.clear(march);
    await user.type(march, "450{Enter}");
    await waitFor(() => expect(march).toBeDisabled());
    expect(
      screen.getByRole("textbox", { name: "Groceries budget for Apr 2025" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("textbox", { name: "Salary budget for Mar 2025" }),
    ).toBeEnabled();
    await act(async () => finishSave());
    await waitFor(() => expect(march).toBeEnabled());
  });

  it("saves only the edited month after unchecking future propagation", async () => {
    const user = userEvent.setup();
    await renderMatrix();
    const checkbox = screen.getByRole("checkbox", {
      name: "Apply changes to future months",
    });
    await user.click(checkbox);
    await user.click(checkbox);
    const input = screen.getByRole("textbox", {
      name: "Groceries budget for Feb 2025",
    });
    await user.clear(input);
    await user.type(input, "450{Enter}");
    await waitFor(() =>
      expect(api.setBudget).toHaveBeenLastCalledWith({
        categoryId: "groceries",
        year: 2025,
        month: 2,
        amount: "450",
        overwriteFutureMonths: false,
      }),
    );
  });

  it("keeps the matrix visible and prevents edits while range data is stale", async () => {
    const { rerender } = await renderMatrix();
    // A wider range has no cached data yet, so the old range stays on screen.
    api.listBudgets.mockReturnValue(new Promise(() => {}));
    windowState.months = [{ year: 2025, month: 1 }, ...FEB_TO_APR];
    rerender(<BudgetMatrixView />);
    await waitFor(() =>
      expect(
        screen.getByRole("table", { name: "Budget matrix" }),
      ).toHaveAttribute("aria-busy", "true"),
    );
    expect(
      screen.getByRole("textbox", { name: "Groceries budget for Mar 2025" }),
    ).toBeDisabled();
  });

  it.each(["categoriesError", "budgetsError", "totalsError"] as const)(
    "reports %s",
    async (source) => {
      mockData({ [source]: new Error("service unavailable") });
      renderWithProviders(<BudgetMatrixView />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "service unavailable",
      );
    },
  );

  it("shows initial loading", () => {
    mockData({ loading: true });
    renderWithProviders(<BudgetMatrixView />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an empty-category message", async () => {
    mockData({ empty: true });
    renderWithProviders(<BudgetMatrixView />);
    expect(await screen.findByText("No categories yet.")).toBeInTheDocument();
  });

  it("restores the current-month position when the table remounts after a query error", async () => {
    const { queryClient } = await renderMatrix();
    expect(
      screen.getByRole("region", { name: "Budget matrix months" }).scrollLeft,
    ).toBe(100);

    mockData({ budgetsError: new Error("temporarily unavailable") });
    await act(() => queryClient.invalidateQueries());
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    mockData();
    await act(() => queryClient.invalidateQueries());
    const region = await screen.findByRole("region", {
      name: "Budget matrix months",
    });
    expect(region.scrollLeft).toBe(100);
  });
});
