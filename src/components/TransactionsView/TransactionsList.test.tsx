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
        totalCount={1}
        page={1}
        onPageChange={() => {}}
        accountNameById={new Map([["acc-1", "Checking"]])}
        categoryNameById={new Map([["cat-1", "Dining"]])}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("TransactionsList", () => {
  it("shows the empty message when totalCount is zero", () => {
    renderList({
      transactions: [],
      totalCount: 0,
      emptyMessage: "Nothing here.",
    });
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("pages via onPageChange using server totals", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const transactions = [makeTxn(1), makeTxn(2)];

    renderList({
      transactions,
      totalCount: 5,
      page: 1,
      pageSize: 2,
      onPageChange,
    });

    expect(screen.getByText("Txn 1")).toBeInTheDocument();
    expect(screen.getByText("Txn 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders edge controls plus a sliding numbered window", () => {
    renderList({
      transactions: [makeTxn(1)],
      totalCount: 100,
      page: 5,
      pageSize: 10,
    });

    // withEdges → first/prev/next/last icon controls (empty accessible name)
    const iconControls = screen
      .getAllByRole("button")
      .filter((button) => button.textContent === "");
    expect(iconControls).toHaveLength(4);

    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument();
  });

  it("forwards row opens to onRowOpen", async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    const txn = makeTxn(1);
    renderList({ transactions: [txn], totalCount: 1, onRowOpen });

    await user.click(screen.getByText("Txn 1"));
    expect(onRowOpen).toHaveBeenCalledWith(txn);
  });
});
