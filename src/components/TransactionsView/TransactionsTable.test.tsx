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

    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    expect(screen.getByText(/12\.50/)).toBeInTheDocument();
  });

  it("falls back to ids when labels are missing and shows em dash without category", () => {
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
    expect(screen.getByText("—")).toBeInTheDocument();
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
    // No handler — click should not throw; row has no button role.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
