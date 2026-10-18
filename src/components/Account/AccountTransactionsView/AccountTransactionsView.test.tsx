import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubIntersectionObserver } from "../../../test/intersectionObserver.js";
import { theme } from "../../../theme.js";
import { CategoryKind } from "../../../models";
import type { Category } from "../../../models";
import { wireCategory } from "../../../test/wire.js";
import AccountTransactionsView from "./AccountTransactionsView.js";
import App from "../../../App.js";

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

const account = {
  id: "acc-1",
  name: "Checking",
  type: 1,
  subType: "Checking",
  balance: "100",
  startingBalance: "0",
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
  amount: "-9.99",
  transactionName: "Lunch",
  merchantName: "Cafe",
};

function renderView(path = "/accounts/acc-1", fullApp = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider theme={theme} env="test">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          {fullApp ? (
            <App />
          ) : (
            <>
              <Link to="/accounts/acc-2">Open savings</Link>
              <Routes>
                <Route
                  path="accounts/:accountId"
                  element={<AccountTransactionsView />}
                />
                <Route path="accounts" element={<p>Accounts overview</p>} />
              </Routes>
            </>
          )}
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.clearAllMocks();
  api.listAccounts.mockResolvedValue({ accounts: [account] });
  api.listCategories.mockResolvedValue({
    categories: [wireCategory(dining), wireCategory(groceries)],
  });
  api.listTransactions.mockResolvedValue({
    transactions: [transaction],
    totalCount: 1,
  });
  api.updateTransaction.mockResolvedValue({});
});

describe("AccountTransactionsView", () => {
  it("serves account transactions through the application route", async () => {
    renderView("/accounts/acc-1", true);
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Checking transactions" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/ships in a later phase/),
    ).not.toBeInTheDocument();
  });

  it("opens a direct account link and reuses transaction labels and formatting", async () => {
    renderView();
    expect(
      await screen.findByRole("heading", { name: "Checking transactions" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    expect(screen.getByText("Cafe")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenCalledWith({
      accountId: "acc-1",
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
    await userEvent.click(
      screen.getByRole("link", { name: "Back to accounts" }),
    );
    expect(screen.getByText("Accounts overview")).toBeInTheDocument();
  });

  it("keeps the back link available during loading", () => {
    api.listAccounts.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to accounts" }),
    ).toHaveAttribute("href", "/accounts");
    expect(api.listTransactions).not.toHaveBeenCalled();
  });

  it.each(["listAccounts", "listCategories", "listTransactions"] as const)(
    "shows errors from %s",
    async (method) => {
      api[method].mockRejectedValue(new Error("Request failed"));
      renderView();
      expect(await screen.findByText("Request failed")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    },
  );

  it("shows an account-specific empty message", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    renderView();
    expect(
      await screen.findByText("No transactions for this account yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("does not fetch transactions for a missing account", async () => {
    renderView("/accounts/missing");
    expect(await screen.findByText("Account not found")).toBeInTheDocument();
    expect(api.listTransactions).not.toHaveBeenCalled();
  });

  it("searches later accounts pages before declaring an account missing", async () => {
    api.listAccounts
      .mockResolvedValueOnce({
        accounts: [],
        nextCursor: { position: 50, limit: 50 },
      })
      .mockResolvedValue({ accounts: [account] });
    api.listCategories
      .mockResolvedValueOnce({
        categories: [],
        nextCursor: { position: 50, limit: 50 },
      })
      .mockResolvedValue({
        categories: [{ id: "cat-1", name: "Dining", categoryType: 1 }],
      });
    renderView();
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(await screen.findByText("Dining")).toBeInTheDocument();
    expect(api.listAccounts).toHaveBeenLastCalledWith({
      cursor: { position: 50, limit: 50 },
    });
    expect(api.listCategories).toHaveBeenLastCalledWith({
      cursor: { position: 50, limit: 50 },
    });
    expect(screen.queryByText("Account not found")).not.toBeInTheDocument();
  });

  it("appends the account's next batch as the list scrolls", async () => {
    const io = stubIntersectionObserver();
    api.listTransactions
      .mockResolvedValueOnce({ transactions: [transaction], totalCount: 2 })
      .mockResolvedValue({
        transactions: [
          { ...transaction, id: "txn-2", transactionName: "Last purchase" },
        ],
        totalCount: 2,
      });
    renderView();
    await screen.findByText("Lunch");
    io.scrollIntoView();
    expect(await screen.findByText("Last purchase")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenLastCalledWith({
      accountId: "acc-1",
      cursor: { position: 1, limit: 25, maxCreationTime: undefined },
    });
  });

  it("starts from the top when navigating to another account", async () => {
    const io = stubIntersectionObserver();
    api.listAccounts.mockResolvedValue({
      accounts: [account, { ...account, id: "acc-2", name: "Savings" }],
    });
    api.listTransactions.mockImplementation(({ accountId }) =>
      Promise.resolve({
        transactions: [
          {
            ...transaction,
            accountId,
            transactionName: accountId === "acc-1" ? "Lunch" : "Deposit",
          },
        ],
        totalCount: 26,
      }),
    );
    renderView();
    await screen.findByText("Lunch");
    io.scrollIntoView();
    await userEvent.click(screen.getByRole("link", { name: "Open savings" }));
    expect(await screen.findByText("Deposit")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Savings transactions" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Lunch")).not.toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenLastCalledWith({
      accountId: "acc-2",
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
  });

  it("saves a new category for the account's transaction", async () => {
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
    expect(screen.getByText("Lunch")).toBeInTheDocument();
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
    expect(
      screen.getByRole("textbox", { name: "Category for Lunch" }),
    ).toHaveValue("Dining");

    await user.click(
      screen.getByRole("button", { name: "Dismiss category update error" }),
    );
    expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
  });
});
