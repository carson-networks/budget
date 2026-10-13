import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { CategoryTransactionsTable } from "./CategoryTransactionsTable.js";

function renderTable(
  props: Partial<ComponentProps<typeof CategoryTransactionsTable>> = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <CategoryTransactionsTable
        transactions={[
          {
            id: "txn-1",
            accountId: "acc-1",
            categoryId: "groceries",
            amount: "-42.10",
            transactionName: "Market run",
          },
        ]}
        totalCount={1}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={() => {}}
        accountNameById={new Map([["acc-1", "Checking"]])}
        categoryNameById={new Map([["groceries", "Groceries"]])}
        categoryName="Groceries"
        isLoading={false}
        error={null}
        categoryUpdateError={null}
        onDismissCategoryUpdateError={() => {}}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("CategoryTransactionsTable", () => {
  it("lists the category's transactions", () => {
    renderTable();
    expect(screen.getByText("Market run")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("$42.10")).toBeInTheDocument();
  });

  it("shows a category empty message", () => {
    renderTable({ transactions: [], totalCount: 0 });
    expect(
      screen.getByText("No Groceries transactions this month."),
    ).toBeInTheDocument();
  });

  it("shows loading and error states in place of the list", () => {
    const { unmount } = renderTable({ isLoading: true });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Market run")).not.toBeInTheDocument();
    unmount();

    renderTable({ error: new Error("list failed") });
    expect(screen.getByText("list failed")).toBeInTheDocument();
    expect(screen.queryByText("Market run")).not.toBeInTheDocument();
  });

  it("renders injected category cells", () => {
    renderTable({
      renderCategory: (transaction) => (
        <span>Editor for {transaction.transactionName}</span>
      ),
    });
    expect(screen.getByText("Editor for Market run")).toBeInTheDocument();
  });

  it("shows and dismisses category update errors above the list", async () => {
    const onDismissCategoryUpdateError = vi.fn();
    renderTable({
      categoryUpdateError: new Error("Save failed"),
      onDismissCategoryUpdateError,
    });
    expect(screen.getByText("Could not update category")).toBeInTheDocument();
    expect(screen.getByText("Market run")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss category update error" }),
    );
    expect(onDismissCategoryUpdateError).toHaveBeenCalledOnce();
  });
});
