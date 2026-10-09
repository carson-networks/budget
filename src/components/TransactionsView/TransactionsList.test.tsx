import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "../../models";
import { stubIntersectionObserver } from "../../test/intersectionObserver.js";
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
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={() => {}}
        accountNameById={new Map([["acc-1", "Checking"]])}
        categoryNameById={new Map([["cat-1", "Dining"]])}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("TransactionsList", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the empty message when totalCount is zero", () => {
    renderList({
      transactions: [],
      totalCount: 0,
      emptyMessage: "Nothing here.",
    });
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("calls onLoadMore when the end of the list scrolls into view", () => {
    const io = stubIntersectionObserver();
    const onLoadMore = vi.fn();
    renderList({ totalCount: 5, hasNextPage: true, onLoadMore });
    expect(onLoadMore).not.toHaveBeenCalled();

    io.scrollIntoView();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not watch for the end of the list once everything is loaded", () => {
    const io = stubIntersectionObserver();
    renderList({ totalCount: 1, hasNextPage: false });
    expect(io.observedCount()).toBe(0);
  });

  it("shows a spinner and stops watching while a batch loads", () => {
    const io = stubIntersectionObserver();
    renderList({ totalCount: 5, hasNextPage: true, isFetchingNextPage: true });
    expect(
      screen.getByLabelText("Loading more transactions"),
    ).toBeInTheDocument();
    expect(io.observedCount()).toBe(0);
  });

  it("offers a retry instead of auto-loading after a failed load", async () => {
    const user = userEvent.setup();
    const io = stubIntersectionObserver();
    const onLoadMore = vi.fn();
    renderList({
      totalCount: 5,
      hasNextPage: true,
      loadMoreError: new Error("Network down"),
      onLoadMore,
    });
    expect(io.observedCount()).toBe(0);
    expect(
      screen.getByText("Could not load more transactions."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("has no pagination controls", () => {
    renderList({ transactions: [makeTxn(1)], totalCount: 100 });
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("forwards row opens to onRowOpen", async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    const txn = makeTxn(1);
    renderList({ transactions: [txn], totalCount: 1, onRowOpen });

    await user.click(screen.getByText("Txn 1"));
    expect(onRowOpen).toHaveBeenCalledWith(txn);
  });

  it("forwards the category editor for each transaction", () => {
    renderList({
      renderCategory: (transaction) => <button>Edit {transaction.id}</button>,
    });
    expect(
      screen.getByRole("button", { name: "Edit txn-1" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dining")).not.toBeInTheDocument();
  });
});
