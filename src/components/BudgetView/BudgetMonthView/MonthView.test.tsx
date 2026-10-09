import { fireEvent, screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import { wireCategory } from "../../../test/wire.js";
import BudgetMonthView from "./MonthView.js";

const api = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listBudgets: vi.fn(),
  getTransactionTotals: vi.fn(),
  setBudget: vi.fn(),
}));
vi.mock("../../../connectRPC/connect.js", () => ({
  categoryClient: { listCategories: api.listCategories },
  budgetClient: { listBudgets: api.listBudgets, setBudget: api.setBudget },
  transactionClient: { getTransactionTotals: api.getTransactionTotals },
}));

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

function mockMonthData() {
  api.listCategories.mockResolvedValue({
    categories: [foodParent, groceries, salary].map(wireCategory),
  });
  api.listBudgets.mockResolvedValue({
    budgets: [
      { categoryId: "groceries", year: 2025, month: 3, amount: "400" },
      { categoryId: "salary", year: 2025, month: 3, amount: "5000" },
    ],
  });
  api.getTransactionTotals.mockResolvedValue({
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
  });
}

function LocationDisplay() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function renderMonthView(initialEntry = "/budget") {
  return renderWithProviders(
    <>
      <BudgetMonthView />
      <LocationDisplay />
    </>,
    { route: initialEntry },
  );
}

describe("BudgetMonthView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Only pin the clock; faking timers would stall React Query's async work.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2025, 2, 15));
    mockMonthData();
    return () => vi.useRealTimers();
  });

  it("renders the selected month, category rows, and month totals", async () => {
    renderMonthView();

    expect(await screen.findByText("Mar 2025")).toBeInTheDocument();
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
    expect(api.listBudgets).toHaveBeenCalledWith({
      startMonth: 3,
      startYear: 2025,
      endMonth: 3,
      endYear: 2025,
    });
  });

  it("keeps the month options control when navigating to a past month", async () => {
    renderMonthView();

    expect(
      await screen.findByRole("button", { name: "Month options" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    expect(await screen.findByText("Feb 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Month options" }),
    ).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    api.listCategories.mockReturnValue(new Promise(() => {}));
    renderMonthView();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error state", async () => {
    api.listBudgets.mockRejectedValue(new Error("budgets down"));
    renderMonthView();
    expect(await screen.findByText("budgets down")).toBeInTheDocument();
  });

  it("opens a category's transactions for the selected month", async () => {
    renderMonthView();
    fireEvent.click(
      await screen.findByRole("button", { name: "Open Groceries transactions" }),
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/budget/categories/groceries?month=2025-03",
    );
  });

  it("opens a category for the month picked in the URL", async () => {
    renderMonthView("/budget?view=month&month=2025-06");
    expect(await screen.findByText("Jun 2025")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Open Salary transactions" }),
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/budget/categories/salary?month=2025-06",
    );
  });
});
