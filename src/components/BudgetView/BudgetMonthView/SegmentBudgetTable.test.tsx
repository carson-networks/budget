import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import type { CategorySegment } from "../../Category/CategoriesView/categorySegments.js";
import { SegmentBudgetTable } from "./SegmentBudgetTable.js";

const api = vi.hoisted(() => ({ setBudget: vi.fn() }));
vi.mock("../../../connectRPC/connect.js", () => ({
  budgetClient: api,
}));

const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  parentCategoryId: "food",
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

const foodParent: Category = {
  id: "food",
  name: "Food",
  isParent: true,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

const segment: CategorySegment = {
  root: foodParent,
  children: [groceries],
};

describe("SegmentBudgetTable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.setBudget.mockResolvedValue({});
  });

  it("commits leaf budget edits and skips parent budget inputs", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SegmentBudgetTable
        segment={segment}
        selectedMonth={{ year: 2025, month: 3 }}
        budgetByCategoryId={new Map([["groceries", "400"]])}
        actualByCategoryId={new Map([["groceries", -320]])}
      />
    );

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Difference")).toBeInTheDocument();
    // Expense difference: 400 + (-320) = 80
    expect(screen.getByText("$80.00")).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(1);

    await user.clear(inputs[0]!);
    await user.type(inputs[0]!, "450");
    await user.tab();

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

  it("passes overwriteFutureMonths when the header option is on", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SegmentBudgetTable
        segment={segment}
        selectedMonth={{ year: 2025, month: 3 }}
        budgetByCategoryId={new Map([["groceries", "400"]])}
        actualByCategoryId={new Map([["groceries", -320]])}
        overwriteFutureMonths
      />
    );

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]!);
    await user.type(inputs[0]!, "500");
    await user.tab();

    await waitFor(() =>
      expect(api.setBudget).toHaveBeenCalledWith({
        categoryId: "groceries",
        year: 2025,
        month: 3,
        amount: "500",
        overwriteFutureMonths: true,
      }),
    );
  });
  describe("opening category transactions", () => {
    const salary: Category = {
      id: "salary",
      name: "Salary",
      isParent: false,
      isDisabled: false,
      categoryKind: CategoryKind.Income,
    };

    function renderOpenable(table: CategorySegment, onOpenCategory = vi.fn()) {
      renderWithProviders(
        <SegmentBudgetTable
          segment={table}
          selectedMonth={{ year: 2025, month: 3 }}
          budgetByCategoryId={new Map([["groceries", "400"]])}
          actualByCategoryId={new Map([["groceries", -320]])}
          onOpenCategory={onOpenCategory}
        />
      );
      return onOpenCategory;
    }

    it("opens a leaf category from its row or name button", async () => {
      const onOpenCategory = renderOpenable(segment);
      await userEvent.click(screen.getByText("-$320.00"));
      expect(onOpenCategory).toHaveBeenLastCalledWith(groceries);

      screen
        .getByRole("button", { name: "Open Groceries transactions" })
        .focus();
      await userEvent.keyboard("{Enter}");
      expect(onOpenCategory).toHaveBeenCalledTimes(2);
    });

    it("keeps budget editing from opening the category", async () => {
      const onOpenCategory = renderOpenable(segment);
      await userEvent.click(screen.getByRole("textbox"));
      expect(onOpenCategory).not.toHaveBeenCalled();
    });

    it("does not open parent categories", async () => {
      const onOpenCategory = renderOpenable(segment);
      await userEvent.click(screen.getByText("Food"));
      expect(onOpenCategory).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Open Food transactions" }),
      ).not.toBeInTheDocument();
    });

    it("opens a root category that is not a parent", async () => {
      const onOpenCategory = renderOpenable({ root: salary, children: [] });
      await userEvent.click(
        screen.getByRole("button", { name: "Open Salary transactions" }),
      );
      expect(onOpenCategory).toHaveBeenCalledExactlyOnceWith(salary);
    });

    it("renders plain names without an open handler", () => {
      renderWithProviders(
        <SegmentBudgetTable
          segment={segment}
          selectedMonth={{ year: 2025, month: 3 }}
          budgetByCategoryId={new Map()}
          actualByCategoryId={new Map()}
        />
      );
      expect(
        screen.queryByRole("button", { name: /transactions/ }),
      ).not.toBeInTheDocument();
    });
  });
});
