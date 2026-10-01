import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";
import type { CategorySegment } from "../../Category/CategoriesView/categorySegments.js";
import { SegmentBudgetTable } from "./SegmentBudgetTable.js";

vi.mock("../../../hooks/useBudgets.js", () => ({
  useSetBudget: vi.fn(),
}));

import { useSetBudget } from "../../../hooks/useBudgets.js";

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
  it("commits leaf budget edits and skips parent budget inputs", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useSetBudget).mockReturnValue({
      mutateAsync,
      isPending: false,
      variables: undefined,
    } as unknown as ReturnType<typeof useSetBudget>);

    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <SegmentBudgetTable
          segment={segment}
          selectedMonth={{ year: 2025, month: 3 }}
          budgetByCategoryId={new Map([["groceries", "400"]])}
          actualByCategoryId={new Map([["groceries", -320]])}
        />
      </MantineProvider>,
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

    expect(mutateAsync).toHaveBeenCalledWith({
      categoryId: "groceries",
      year: 2025,
      month: 3,
      amount: "450",
      overwriteFutureMonths: false,
    });
  });

  it("passes overwriteFutureMonths when the header option is on", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useSetBudget).mockReturnValue({
      mutateAsync,
      isPending: false,
      variables: undefined,
    } as unknown as ReturnType<typeof useSetBudget>);

    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <SegmentBudgetTable
          segment={segment}
          selectedMonth={{ year: 2025, month: 3 }}
          budgetByCategoryId={new Map([["groceries", "400"]])}
          actualByCategoryId={new Map([["groceries", -320]])}
          overwriteFutureMonths
        />
      </MantineProvider>,
    );

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]!);
    await user.type(inputs[0]!, "500");
    await user.tab();

    expect(mutateAsync).toHaveBeenCalledWith({
      categoryId: "groceries",
      year: 2025,
      month: 3,
      amount: "500",
      overwriteFutureMonths: true,
    });
  });
});
