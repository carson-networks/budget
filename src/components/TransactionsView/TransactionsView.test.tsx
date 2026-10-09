import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind, CategoryKind } from "../../models";
import type { Account, Category, Transaction } from "../../models";
import { theme } from "../../theme.js";

vi.mock(import("../../hooks/useTransactions.js"), () => ({
  useAllTransactions: vi.fn(),
  TRANSACTIONS_PAGE_SIZE: 25 as const,
}));

vi.mock(import("../../hooks/useAccounts.js"), () => ({
  useAllAccounts: vi.fn(),
}));

vi.mock(import("../../hooks/useCategories.js"), () => ({
  useAllCategories: vi.fn(),
}));

const { updateCategory } = vi.hoisted(() => ({
  updateCategory: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));
vi.mock("../../hooks/useUpdateTransactionCategory.js", () => ({
  useUpdateTransactionCategory: () => updateCategory,
}));

import { useAllAccounts } from "../../hooks/useAccounts.js";
import { useAllCategories } from "../../hooks/useCategories.js";
import { useAllTransactions } from "../../hooks/useTransactions.js";
import TransactionsView from "./TransactionsView.js";

const account: Account = {
  id: "acc-1",
  name: "Checking",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "100",
  startingBalance: "0",
  integration: AccountIntegration.Manual,
};

const category: Category = {
  id: "cat-1",
  name: "Dining",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

const transaction: Transaction = {
  id: "txn-1",
  accountId: "acc-1",
  categoryId: "cat-1",
  amount: "9.99",
  transactionName: "Lunch",
};

function mockTransactions(
  partial: Partial<ReturnType<typeof useAllTransactions>>,
) {
  vi.mocked(useAllTransactions).mockReturnValue({
    transactions: [],
    totalCount: 0,
    totalPages: 1,
    page: 1,
    setPage: vi.fn(),
    pageSize: 25,
    isLoading: false,
    isPlaceholderData: false,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    status: "success",
    ...partial,
  } as ReturnType<typeof useAllTransactions>);
}

function mockAccounts(partial: Partial<ReturnType<typeof useAllAccounts>>) {
  vi.mocked(useAllAccounts).mockReturnValue({
    accounts: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    status: "success",
    ...partial,
  } as ReturnType<typeof useAllAccounts>);
}

function mockCategories(partial: Partial<ReturnType<typeof useAllCategories>>) {
  vi.mocked(useAllCategories).mockReturnValue({
    categories: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    status: "success",
    ...partial,
  } as ReturnType<typeof useAllCategories>);
}

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider theme={theme} env="test">
      <QueryClientProvider client={queryClient}>
        <TransactionsView />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("TransactionsView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    updateCategory.mutate.mockReset();
    updateCategory.reset.mockReset();
    updateCategory.isPending = false;
    updateCategory.isError = false;
    updateCategory.error = null;
    mockTransactions({ transactions: [], totalCount: 0 });
    mockAccounts({ accounts: [] });
    mockCategories({ categories: [] });
  });

  it("shows a loading state while transactions load", () => {
    mockTransactions({ isLoading: true, isPlaceholderData: false });
    renderView();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error alert when listing fails", () => {
    mockTransactions({ error: new Error("boom") });
    renderView();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("renders the all-transactions list with resolved labels", () => {
    mockTransactions({ transactions: [transaction], totalCount: 1 });
    mockAccounts({ accounts: [account] });
    mockCategories({ categories: [category] });
    renderView();

    expect(
      screen.getByRole("heading", { name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Category for Lunch" }),
    ).toHaveValue("Dining");
  });

  it("shows the empty list message when there are no transactions", () => {
    renderView();
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
  });

  it("saves the selected category for the correct transaction", async () => {
    const user = userEvent.setup();
    mockTransactions({ transactions: [transaction], totalCount: 1 });
    mockCategories({
      categories: [category, { ...category, id: "cat-2", name: "Groceries" }],
    });
    renderView();
    await user.click(
      screen.getByRole("textbox", { name: "Category for Lunch" }),
    );
    await user.click(screen.getByRole("option", { name: "Groceries" }));
    expect(updateCategory.mutate).toHaveBeenCalledExactlyOnceWith({
      transactionId: "txn-1",
      categoryId: "cat-2",
    });
  });

  it.each(["pending", "placeholder"])(
    "disables category editing during %s state",
    (state) => {
      updateCategory.isPending = state === "pending";
      mockTransactions({
        transactions: [transaction],
        totalCount: 1,
        isPlaceholderData: state === "placeholder",
      });
      mockCategories({ categories: [category] });
      renderView();
      expect(
        screen.getByRole("textbox", { name: "Category for Lunch" }),
      ).toBeDisabled();
    },
  );

  it("shows a dismissible save error while keeping transactions available", async () => {
    const user = userEvent.setup();
    updateCategory.isError = true;
    updateCategory.error = new Error("Save failed");
    mockTransactions({ transactions: [transaction], totalCount: 1 });
    mockCategories({ categories: [category] });
    renderView();
    expect(screen.getByText("Could not update category")).toBeInTheDocument();
    expect(screen.getByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Dismiss category update error" }),
    );
    expect(updateCategory.reset).toHaveBeenCalledExactlyOnceWith();
  });
});
