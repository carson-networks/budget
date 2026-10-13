import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { theme } from "../../../theme.js";
import { AccountTable } from "./AccountTable.js";

const sample: Account = {
  id: "acc-1",
  name: "House Fund",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "10",
  startingBalance: "10",
  integration: AccountIntegration.Manual,
};

describe("AccountTable", () => {
  it("calls onRowNavigate when a data cell is clicked", async () => {
    const user = userEvent.setup();
    const onRowNavigate = vi.fn();
    const onOpenEdit = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <AccountTable
          accounts={[sample]}
          onRowNavigate={onRowNavigate}
          onOpenEdit={onOpenEdit}
        />
      </MantineProvider>,
    );

    await user.click(screen.getByText("House Fund"));
    expect(onRowNavigate).toHaveBeenCalledWith(sample);
    expect(onOpenEdit).not.toHaveBeenCalled();
  });

  it("calls onOpenEdit for the settings action without row navigation", async () => {
    const user = userEvent.setup();
    const onRowNavigate = vi.fn();
    const onOpenEdit = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <AccountTable
          accounts={[sample]}
          onRowNavigate={onRowNavigate}
          onOpenEdit={onOpenEdit}
        />
      </MantineProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Settings for House Fund" }),
    );
    expect(onOpenEdit).toHaveBeenCalledWith(sample);
    expect(onRowNavigate).not.toHaveBeenCalled();
  });
});
