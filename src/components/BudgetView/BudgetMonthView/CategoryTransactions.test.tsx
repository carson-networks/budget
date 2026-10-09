import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { CategoryKind } from "../../../models";
import { CategoryTransactions } from "./CategoryTransactions.js";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listCategories: vi.fn(),
  listTransactions: vi.fn(),
}));
vi.mock("../../../connectRPC/connect.js", () => ({
  accountClient: { listAccounts: api.listAccounts },
  categoryClient: { listCategories: api.listCategories },
  transactionClient: { listTransactions: api.listTransactions },
}));

const groceries = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

let queryClient: QueryClient;

function renderCategoryTransactions(
  props: Partial<ComponentProps<typeof CategoryTransactions>> = {},
) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <CategoryTransactions
          month={{ year: 2025, month: 3 }}
          category={groceries}
          onPrevMonth={() => {}}
          onNextMonth={() => {}}
          onGoToToday={() => {}}
          onBack={() => {}}
          {...props}
        />
      </QueryClientProvider>
    </MantineProvider>,
  );
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
    categories: [{ id: "groceries", name: "Groceries", categoryType: 1 }],
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

    rerender(
      <MantineProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <CategoryTransactions
            month={{ year: 2025, month: 4 }}
            category={groceries}
            onPrevMonth={() => {}}
            onNextMonth={() => {}}
            onGoToToday={() => {}}
            onBack={() => {}}
          />
        </QueryClientProvider>
      </MantineProvider>,
    );
    expect(await screen.findByText("Shop in month 4")).toBeInTheDocument();
    expect(screen.queryByText("Shop in month 3")).not.toBeInTheDocument();
    expect(screen.getByText("Apr 2025")).toBeInTheDocument();
  });
});
