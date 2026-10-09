import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { MonthTransactionsSection } from "./MonthTransactionsSection.js";

function renderSection(
  props: Partial<ComponentProps<typeof MonthTransactionsSection>> = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <MonthTransactionsSection
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
        page={1}
        onPageChange={() => {}}
        accountNameById={new Map([["acc-1", "Checking"]])}
        categoryNameById={new Map([["groceries", "Groceries"]])}
        onClearCategory={() => {}}
        isLoading={false}
        error={null}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("MonthTransactionsSection", () => {
  it("lists the month's transactions without a category filter", () => {
    renderSection();
    expect(
      screen.getByRole("heading", { name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Market run")).toBeInTheDocument();
    expect(screen.getByText("$42.10")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear category filter" }),
    ).not.toBeInTheDocument();
  });

  it("shows the selected category and clears it", async () => {
    const onClearCategory = vi.fn();
    renderSection({ categoryName: "Groceries", onClearCategory });
    await userEvent.click(
      screen.getByRole("button", { name: "Clear category filter" }),
    );
    expect(onClearCategory).toHaveBeenCalledOnce();
  });

  it.each([
    [undefined, "No transactions this month."],
    ["Groceries", "No Groceries transactions this month."],
  ])("shows an empty message for category %s", (categoryName, message) => {
    renderSection({ transactions: [], totalCount: 0, categoryName });
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("shows loading and error states in place of the list", () => {
    const { unmount } = renderSection({ isLoading: true });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Market run")).not.toBeInTheDocument();
    unmount();

    renderSection({ error: new Error("list failed") });
    expect(screen.getByText("list failed")).toBeInTheDocument();
    expect(screen.queryByText("Market run")).not.toBeInTheDocument();
  });
});
