import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "../../models";
import { theme } from "../../theme.js";
import { TransactionsTable } from "./TransactionsTable.js";

const sample: Transaction = {
  id: "txn-1",
  accountId: "acc-1",
  categoryId: "cat-1",
  amount: "12.50",
  transactionName: "Coffee",
  merchantName: "Starbucks",
};

function renderTable(
  props: Partial<ComponentProps<typeof TransactionsTable>> = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <TransactionsTable
        transactions={[sample]}
        accountNameById={new Map([["acc-1", "Checking"]])}
        categoryNameById={new Map([["cat-1", "Dining"]])}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("TransactionsTable", () => {
  it("renders transaction fields with resolved account and category labels", () => {
    renderTable();

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "",
      "Merchant",
      "Transaction",
      "Account",
      "Category",
      "Amount",
    ]);
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Starbucks")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    expect(screen.getByText(/\+.*12\.50/)).toBeInTheDocument();
  });

  it("shows a normal minus for negative amounts and a plus for positives", () => {
    renderTable({
      transactions: [
        { ...sample, id: "txn-out", amount: "-9.99", transactionName: "Out" },
        { ...sample, id: "txn-in", amount: "5.00", transactionName: "In" },
      ],
    });

    expect(screen.getByText(/-.*9\.99/)).toBeInTheDocument();
    expect(screen.getByText(/\+.*5\.00/)).toBeInTheDocument();
  });

  it("falls back to ids when labels are missing and shows em dash without category or merchant", () => {
    renderTable({
      transactions: [
        {
          id: "txn-2",
          accountId: "acc-missing",
          amount: "1.00",
          transactionName: "Unknown",
        },
      ],
      accountNameById: new Map(),
      categoryNameById: new Map(),
    });

    expect(screen.getByText("acc-missing")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("shows an em dash when merchantName is empty", () => {
    renderTable({
      transactions: [
        {
          ...sample,
          id: "txn-empty-merchant",
          merchantName: "   ",
        },
      ],
    });

    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("Starbucks")).not.toBeInTheDocument();
  });

  it("calls onRowOpen when a row is clicked", async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    renderTable({ onRowOpen });

    await user.click(screen.getByText("Coffee"));
    expect(onRowOpen).toHaveBeenCalledWith(sample);
  });

  it("does not treat the row as a button when onRowOpen is omitted", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByText("Coffee"));
    // No handler - click should not throw; row has no button role.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders vertical column divider lines", () => {
    const { container } = renderTable();
    const table = container.querySelector("table");
    expect(table).toHaveAttribute("data-with-table-border", "true");
    const cells = container.querySelectorAll("th, td");
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell).toHaveAttribute("data-with-column-border", "true");
    }
  });
});
