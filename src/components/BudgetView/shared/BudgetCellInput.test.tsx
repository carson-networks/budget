import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { BudgetCellInput } from "./BudgetCellInput.js";

function renderCell(
  props: Partial<ComponentProps<typeof BudgetCellInput>> = {},
) {
  const onCommit = props.onCommit ?? vi.fn();
  render(
    <MantineProvider theme={theme}>
      <BudgetCellInput amountStr="100" onCommit={onCommit} {...props} />
    </MantineProvider>,
  );
  return { onCommit };
}

describe("BudgetCellInput", () => {
  it("asks about following months before committing, defaulting to No", async () => {
    const user = userEvent.setup();
    const { onCommit } = renderCell();
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "250");
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", {
        name: "Apply budget to following months",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Change the budget for all months following this one?",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "No" }));

    expect(onCommit).toHaveBeenCalledWith("250", false);
  });

  it("commits with overwriteFutureMonths when Yes is chosen", async () => {
    const user = userEvent.setup();
    const { onCommit } = renderCell();
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "250");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onCommit).toHaveBeenCalledWith("250", true);
  });

  it("does not commit when the normalized value is unchanged", async () => {
    const user = userEvent.setup();
    const { onCommit } = renderCell({ amountStr: "100" });
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", {
        name: "Apply budget to following months",
      }),
    ).not.toBeInTheDocument();
  });

  it("reverts the field when onCommit rejects", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockRejectedValue(new Error("nope"));
    renderCell({ onCommit, amountStr: "100" });
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "250");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(onCommit).toHaveBeenCalledWith("250", false);
    expect(input).toHaveValue("$100");
  });
});
