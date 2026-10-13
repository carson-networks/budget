import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind, CategoryKind } from "../../models";
import type { Account, Category } from "../../models";
import { stubIntersectionObserver } from "../../test/intersectionObserver.js";
import { renderWithProviders } from "../../test/renderWithProviders.js";
import { wireAccount, wireCategory } from "../../test/wire.js";
import TransactionsView from "./TransactionsView.js";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listCategories: vi.fn(),
  listTransactions: vi.fn(),
  updateTransaction: vi.fn(),
}));
vi.mock("../../connectRPC/connect.js", () => ({
  accountClient: { listAccounts: api.listAccounts },
  categoryClient: { listCategories: api.listCategories },
  transactionClient: {
    listTransactions: api.listTransactions,
    updateTransaction: api.updateTransaction,
  },
}));

const account: Account = {
  id: "acc-1",
  name: "Checking",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "100",
  startingBalance: "0",
  integration: AccountIntegration.Manual,
};

const dining: Category = {
  id: "cat-1",
  name: "Dining",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};
const groceries: Category = { ...dining, id: "cat-2", name: "Groceries" };

const transaction = {
  id: "txn-1",
  accountId: "acc-1",
  categoryId: "cat-1",
  amount: "9.99",
  transactionName: "Lunch",
};

function renderView() {
  return renderWithProviders(<TransactionsView />);
}

describe("TransactionsView", () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.resetAllMocks();
    api.listAccounts.mockResolvedValue({ accounts: [wireAccount(account)] });
    api.listCategories.mockResolvedValue({
      categories: [wireCategory(dining), wireCategory(groceries)],
    });
    api.listTransactions.mockResolvedValue({
      transactions: [transaction],
      totalCount: 1,
    });
    api.updateTransaction.mockResolvedValue({});
  });

  it("shows a loading state while transactions load", () => {
    api.listTransactions.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error alert when listing fails", async () => {
    api.listTransactions.mockRejectedValue(new Error("boom"));
    renderView();
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders the all-transactions list with resolved labels", async () => {
    renderView();

    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Category for Lunch" }),
    ).toHaveValue("Dining");
  });

  it("shows the empty list message when there are no transactions", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    renderView();
    expect(await screen.findByText("No transactions yet.")).toBeInTheDocument();
  });

  it("saves the selected category for the correct transaction", async () => {
    const user = userEvent.setup();
    api.updateTransaction.mockImplementation(async () => {
      // The refetch after the save sees the server's new state.
      api.listTransactions.mockResolvedValue({
        transactions: [{ ...transaction, categoryId: "cat-2" }],
        totalCount: 1,
      });
      return {};
    });
    renderView();
    await user.click(
      await screen.findByRole("textbox", { name: "Category for Lunch" }),
    );
    await user.click(screen.getByRole("option", { name: "Groceries" }));
    expect(api.updateTransaction).toHaveBeenCalledExactlyOnceWith({
      id: "txn-1",
      categoryId: "cat-2",
    });
    expect(
      await screen.findByRole("textbox", { name: "Category for Lunch" }),
    ).toHaveValue("Groceries");
  });

  it("disables category editing while a save is pending", async () => {
    const user = userEvent.setup();
    api.updateTransaction.mockReturnValue(new Promise(() => {}));
    renderView();
    await user.click(
      await screen.findByRole("textbox", { name: "Category for Lunch" }),
    );
    await user.click(screen.getByRole("option", { name: "Groceries" }));
    expect(
      await screen.findByRole("textbox", { name: "Category for Lunch" }),
    ).toBeDisabled();
  });

  it("loads the next batch as the end of the list scrolls into view", async () => {
    const io = stubIntersectionObserver();
    api.listTransactions
      .mockResolvedValueOnce({ transactions: [transaction], totalCount: 2 })
      .mockResolvedValue({
        transactions: [
          { ...transaction, id: "txn-2", transactionName: "Dinner" },
        ],
        totalCount: 2,
      });
    renderView();
    await screen.findByText("Lunch");
    expect(api.listTransactions).toHaveBeenCalledTimes(1);

    io.scrollIntoView();
    expect(await screen.findByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenLastCalledWith({
      cursor: { position: 1, limit: 25, maxCreationTime: undefined },
    });
    await waitFor(() => expect(io.observedCount()).toBe(0));
  });

  it("keeps the list and offers a retry when loading more fails", async () => {
    const user = userEvent.setup();
    const io = stubIntersectionObserver();
    api.listTransactions
      .mockResolvedValueOnce({ transactions: [transaction], totalCount: 2 })
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValue({
        transactions: [
          { ...transaction, id: "txn-2", transactionName: "Dinner" },
        ],
        totalCount: 2,
      });
    renderView();
    await screen.findByText("Lunch");

    io.scrollIntoView();
    expect(
      await screen.findByText("Could not load more transactions."),
    ).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Dinner")).toBeInTheDocument();
  });

  it("shows a dismissible save error and restores the previous category", async () => {
    const user = userEvent.setup();
    api.updateTransaction.mockRejectedValue(new Error("Save failed"));
    renderView();
    await user.click(
      await screen.findByRole("textbox", { name: "Category for Lunch" }),
    );
    await user.click(screen.getByRole("option", { name: "Groceries" }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Could not update category")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Category for Lunch" }),
    ).toHaveValue("Dining");

    await user.click(
      screen.getByRole("button", { name: "Dismiss category update error" }),
    );
    expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
  });
});
