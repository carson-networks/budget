import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { CategoryTransactionsPanel } from "./CategoryTransactionsPanel.js";

function renderPanel(
  props: Partial<ComponentProps<typeof CategoryTransactionsPanel>> = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <CategoryTransactionsPanel
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
        categoryName="Groceries"
        month={{ year: 2025, month: 3 }}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onGoToToday={() => {}}
        onBack={() => {}}
        isLoading={false}
        error={null}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("CategoryTransactionsPanel", () => {
  it("heads the view with the category and shows its transactions", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { name: "Groceries" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
    expect(screen.getByText("Market run")).toBeInTheDocument();
    expect(screen.getByText("$42.10")).toBeInTheDocument();
  });

  it("calls onBack from the back button", async () => {
    const onBack = vi.fn();
    renderPanel({ onBack });
    await userEvent.click(
      screen.getByRole("button", { name: "Back to budget" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("pages months from its own toolbar", async () => {
    const onPrevMonth = vi.fn();
    const onNextMonth = vi.fn();
    const onGoToToday = vi.fn();
    renderPanel({ onPrevMonth, onNextMonth, onGoToToday });
    await userEvent.click(
      screen.getByRole("button", { name: "Previous month" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onPrevMonth).toHaveBeenCalledOnce();
    expect(onNextMonth).toHaveBeenCalledOnce();
    expect(onGoToToday).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Month options" }),
    ).not.toBeInTheDocument();
  });

  it("shows a category empty message", () => {
    renderPanel({ transactions: [], totalCount: 0 });
    expect(
      screen.getByText("No Groceries transactions this month."),
    ).toBeInTheDocument();
  });

  it("shows loading and error states in place of the list", () => {
    const { unmount } = renderPanel({ isLoading: true });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Market run")).not.toBeInTheDocument();
    unmount();

    renderPanel({ error: new Error("list failed") });
    expect(screen.getByText("list failed")).toBeInTheDocument();
    expect(screen.queryByText("Market run")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to budget" }),
    ).toBeInTheDocument();
  });
});
