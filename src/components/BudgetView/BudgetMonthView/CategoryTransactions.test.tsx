import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import { CategoryKind } from "../../../models";
import { CategoryTransactions } from "./CategoryTransactions.js";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listCategories: vi.fn(),
  listTransactions: vi.fn(),
  updateTransaction: vi.fn(),
}));
vi.mock("../../../connectRPC/connect.js", () => ({
  accountClient: { listAccounts: api.listAccounts },
  categoryClient: { listCategories: api.listCategories },
  transactionClient: {
    listTransactions: api.listTransactions,
    updateTransaction: api.updateTransaction,
  },
}));

const groceries = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

function categoryTransactions(
  props: Partial<ComponentProps<typeof CategoryTransactions>> = {},
) {
  return (
    <CategoryTransactions
      month={{ year: 2025, month: 3 }}
      category={groceries}
      onPrevMonth={() => {}}
      onNextMonth={() => {}}
      onGoToToday={() => {}}
      onBack={() => {}}
      {...props}
    />
  );
}

function renderCategoryTransactions(
  props: Partial<ComponentProps<typeof CategoryTransactions>> = {},
) {
  return renderWithProviders(categoryTransactions(props));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAccounts.mockResolvedValue({
    accounts: [
      {
        id: "acc-1",
        name: "Checking",
        type: 1,
        subType: "Checking",
        balance: "0",
        startingBalance: "0",
      },
    ],
  });
  api.listCategories.mockResolvedValue({
    categories: [
      { id: "groceries", name: "Groceries", categoryType: 1 },
      { id: "dining", name: "Dining", categoryType: 1 },
    ],
  });
  api.listTransactions.mockResolvedValue({
    transactions: [
      {
        id: "txn-1",
        accountId: "acc-1",
        categoryId: "groceries",
        amount: "-42.10",
        transactionName: "Market run",
      },
    ],
    totalCount: 1,
  });
});

describe("CategoryTransactions", () => {
  it("lists the category's transactions for the month with account and category names", async () => {
    renderCategoryTransactions();
    expect(await screen.findByText("Market run")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Groceries" }),
    ).toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenCalledWith({
      categoryId: "groceries",
      month: { year: 2025, month: 3 },
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
  });

  it("goes back to the budget", async () => {
    const onBack = vi.fn();
    renderCategoryTransactions({ onBack });
    await userEvent.click(
      screen.getByRole("button", { name: "Back to budget" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows the category's empty message", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    renderCategoryTransactions();
    expect(
      await screen.findByText("No Groceries transactions this month."),
    ).toBeInTheDocument();
  });

  it.each(["listAccounts", "listCategories", "listTransactions"] as const)(
    "shows errors from %s",
    async (method) => {
      api[method].mockRejectedValue(new Error("Request failed"));
      renderCategoryTransactions();
      expect(await screen.findByText("Request failed")).toBeInTheDocument();
      expect(screen.queryByText("Market run")).not.toBeInTheDocument();
    },
  );

  it("loads the new month's transactions when the month changes", async () => {
    api.listTransactions.mockImplementation(({ month }) =>
      Promise.resolve({
        transactions: [
          {
            id: `txn-${month.month}`,
            accountId: "acc-1",
            categoryId: "groceries",
            amount: "-1",
            transactionName: `Shop in month ${month.month}`,
          },
        ],
        totalCount: 1,
      }),
    );
    const { rerender } = renderCategoryTransactions();
    expect(await screen.findByText("Shop in month 3")).toBeInTheDocument();

    rerender(categoryTransactions({ month: { year: 2025, month: 4 } }));
    expect(await screen.findByText("Shop in month 4")).toBeInTheDocument();
    expect(screen.queryByText("Shop in month 3")).not.toBeInTheDocument();
    expect(screen.getByText("Apr 2025")).toBeInTheDocument();
  });

  it("moves a transaction out of the table when its category changes", async () => {
    let finishSave!: () => void;
    api.updateTransaction.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
    );
    const user = userEvent.setup();
    renderCategoryTransactions();
    await user.click(
      await screen.findByRole("textbox", { name: "Category for Market run" }),
    );
    await user.click(screen.getByRole("option", { name: "Dining" }));

    expect(api.updateTransaction).toHaveBeenCalledExactlyOnceWith({
      id: "txn-1",
      categoryId: "dining",
    });
    expect(
      await screen.findByText("No Groceries transactions this month."),
    ).toBeInTheDocument();

    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    finishSave();
    await waitFor(() => expect(api.listTransactions).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText("No Groceries transactions this month."),
    ).toBeInTheDocument();
  });

  it("shows a category update failure and restores the row", async () => {
    api.updateTransaction.mockRejectedValue(new Error("Save failed"));
    const user = userEvent.setup();
    renderCategoryTransactions();
    await user.click(
      await screen.findByRole("textbox", { name: "Category for Market run" }),
    );
    await user.click(screen.getByRole("option", { name: "Dining" }));
    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Market run")).toBeInTheDocument();
  });
});
