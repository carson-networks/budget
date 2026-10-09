import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { MonthTransactions } from "./MonthTransactions.js";

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

function renderMonthTransactions(
  props: Partial<ComponentProps<typeof MonthTransactions>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={client}>
        <MonthTransactions
          month={{ year: 2025, month: 3 }}
          onClearCategory={() => {}}
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

describe("MonthTransactions", () => {
  it("lists the selected month's transactions with account and category names", async () => {
    renderMonthTransactions();
    expect(await screen.findByText("Market run")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenCalledWith({
      month: { year: 2025, month: 3 },
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
  });

  it("narrows to the selected category and labels the filter", async () => {
    const onClearCategory = vi.fn();
    renderMonthTransactions({ categoryId: "groceries", onClearCategory });
    expect(await screen.findByText("Market run")).toBeInTheDocument();
    expect(api.listTransactions).toHaveBeenCalledWith({
      categoryId: "groceries",
      month: { year: 2025, month: 3 },
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Clear category filter" }),
    );
    expect(onClearCategory).toHaveBeenCalledOnce();
  });

  it("shows the category's empty message", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    renderMonthTransactions({ categoryId: "groceries" });
    expect(
      await screen.findByText("No Groceries transactions this month."),
    ).toBeInTheDocument();
  });

  it.each(["listAccounts", "listCategories", "listTransactions"] as const)(
    "shows errors from %s",
    async (method) => {
      api[method].mockRejectedValue(new Error("Request failed"));
      renderMonthTransactions();
      expect(await screen.findByText("Request failed")).toBeInTheDocument();
      expect(screen.queryByText("Market run")).not.toBeInTheDocument();
    },
  );
});
