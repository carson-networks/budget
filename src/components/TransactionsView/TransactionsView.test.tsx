import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind, CategoryKind } from "../../models";
import type { Account, Category, Transaction } from "../../models";
import { theme } from "../../theme.js";

vi.mock(import("../../hooks/useTransactions.js"), () => ({
  useAllTransactions: vi.fn(),
}));

vi.mock(import("../../hooks/useAccounts.js"), () => ({
  useAllAccounts: vi.fn(),
}));

vi.mock(import("../../hooks/useCategories.js"), () => ({
  useAllCategories: vi.fn(),
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
    isLoading: false,
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

function mockCategories(
  partial: Partial<ReturnType<typeof useAllCategories>>,
) {
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
    <MantineProvider theme={theme}>
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
    mockTransactions({ transactions: [] });
    mockAccounts({ accounts: [] });
    mockCategories({ categories: [] });
  });

  it("shows a loading state while transactions load", () => {
    mockTransactions({ isLoading: true });
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
    mockTransactions({ transactions: [transaction] });
    mockAccounts({ accounts: [account] });
    mockCategories({ categories: [category] });
    renderView();

    expect(
      screen.getByRole("heading", { name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
  });

  it("shows the empty list message when there are no transactions", () => {
    renderView();
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
  });
});
