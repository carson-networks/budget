import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { CategoryTransactionsHeader } from "./CategoryTransactionsHeader.js";

function renderHeader(
  props: Partial<ComponentProps<typeof CategoryTransactionsHeader>> = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <CategoryTransactionsHeader
        categoryName="Groceries"
        month={{ year: 2025, month: 3 }}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onGoToToday={() => {}}
        onBack={() => {}}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("CategoryTransactionsHeader", () => {
  it("shows the category name and selected month", () => {
    renderHeader();
    expect(
      screen.getByRole("heading", { name: "Groceries" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Month options" }),
    ).not.toBeInTheDocument();
  });

  it("goes back to the budget", async () => {
    const onBack = vi.fn();
    renderHeader({ onBack });
    await userEvent.click(
      screen.getByRole("button", { name: "Back to budget" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("pages months from its toolbar", async () => {
    const onPrevMonth = vi.fn();
    const onNextMonth = vi.fn();
    const onGoToToday = vi.fn();
    renderHeader({ onPrevMonth, onNextMonth, onGoToToday });
    await userEvent.click(
      screen.getByRole("button", { name: "Previous month" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onPrevMonth).toHaveBeenCalledOnce();
    expect(onNextMonth).toHaveBeenCalledOnce();
    expect(onGoToToday).toHaveBeenCalledOnce();
  });
});
