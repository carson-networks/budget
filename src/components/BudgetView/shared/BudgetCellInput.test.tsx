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
  it("commits a changed whole-dollar amount on blur", async () => {
    const user = userEvent.setup();
    const { onCommit } = renderCell();
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "250");
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith("250");
  });

  it("does not commit when the normalized value is unchanged", async () => {
    const user = userEvent.setup();
    const { onCommit } = renderCell({ amountStr: "100" });
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("reverts the field when onCommit rejects", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockRejectedValue(new Error("nope"));
    renderCell({ onCommit, amountStr: "100" });
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "250");
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith("250");
    expect(input).toHaveValue("$100");
  });
});
