import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import { wireCategory } from "../../../test/wire.js";

const api = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../../connectRPC/connect.js", () => ({
  categoryClient: api,
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

import BudgetCategoryTransactionsView from "./BudgetCategoryTransactionsView.js";

const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

function mockCategories(categories: Category[] = [groceries]) {
  api.listCategories.mockResolvedValue({
    categories: categories.map(wireCategory),
  });
}

function LocationDisplay() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function renderView(entry: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route
          path="budget/categories/:categoryId"
          element={<BudgetCategoryTransactionsView />}
        />
      </Routes>
      <LocationDisplay />
    </>,
    { route: entry },
  );
}

describe("BudgetCategoryTransactionsView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCategories();
  });

  it("shows the category named in the URL for the month in the URL", async () => {
    renderView("/budget/categories/groceries?month=2025-03");
    expect(await screen.findByTestId("category-transactions")).toHaveTextContent(
      "Groceries 2025-3",
    );
  });

  it("changes the month in the URL when stepping months", async () => {
    renderView("/budget/categories/groceries?month=2025-03");
    await userEvent.click(await screen.findByRole("button", { name: "Next stub" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/budget/categories/groceries?month=2025-04",
    );
    expect(screen.getByTestId("category-transactions")).toHaveTextContent(
      "Groceries 2025-4",
    );
  });

  it("goes back to the month view on the same month", async () => {
    renderView("/budget/categories/groceries?month=2025-03");
    await userEvent.click(await screen.findByRole("button", { name: "Back stub" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/budget?view=month&month=2025-03",
    );
  });

  it("explains when the category does not exist", async () => {
    renderView("/budget/categories/missing?month=2025-03");
    expect(await screen.findByText("Category not found")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    api.listCategories.mockReturnValue(new Promise(() => {}));
    renderView("/budget/categories/groceries");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error state", async () => {
    api.listCategories.mockRejectedValue(new Error("categories down"));
    renderView("/budget/categories/groceries");
    expect(await screen.findByText("categories down")).toBeInTheDocument();
  });
});
