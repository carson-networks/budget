import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "../../models";
import { theme } from "../../theme.js";
import { TransactionsList } from "./TransactionsList.js";

function makeTxn(index: number): Transaction {
  return {
    id: `txn-${index}`,
    accountId: "acc-1",
    categoryId: "cat-1",
    amount: String(index),
    transactionName: `Txn ${index}`,
  };
}

function renderList(
  props: Partial<ComponentProps<typeof TransactionsList>> = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <TransactionsList
        transactions={[makeTxn(1)]}
        accountNameById={new Map([["acc-1", "Checking"]])}
        categoryNameById={new Map([["cat-1", "Dining"]])}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("TransactionsList", () => {
  it("shows the empty message when there are no transactions", () => {
    renderList({
      transactions: [],
      emptyMessage: "Nothing here.",
    });
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("paginates and changes pages", async () => {
    const user = userEvent.setup();
    const transactions = [1, 2, 3].map(makeTxn);

    renderList({ transactions, pageSize: 2 });

    expect(screen.getByText("Txn 1")).toBeInTheDocument();
    expect(screen.getByText("Txn 2")).toBeInTheDocument();
    expect(screen.queryByText("Txn 3")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByText("Txn 3")).toBeInTheDocument();
    expect(screen.queryByText("Txn 1")).not.toBeInTheDocument();
  });

  it("forwards row opens to onRowOpen", async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    const txn = makeTxn(1);
    renderList({ transactions: [txn], onRowOpen });

    await user.click(screen.getByText("Txn 1"));
    expect(onRowOpen).toHaveBeenCalledWith(txn);
  });
});
