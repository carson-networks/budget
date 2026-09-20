import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { theme } from "../../../theme.js";
import { AccountDetailRows } from "./AccountDetailRows.js";

const account: Account = {
  id: "acc-1",
  name: "House Fund",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "42.50",
  startingBalance: "10.00",
  integration: AccountIntegration.Manual,
};

describe("AccountDetailRows", () => {
  it("renders name, sub type, and formatted balances", () => {
    render(
      <MantineProvider theme={theme}>
        <AccountDetailRows account={account} />
      </MantineProvider>,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("House Fund")).toBeInTheDocument();
    expect(screen.getByText("Sub type")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Starting balance")).toBeInTheDocument();
    expect(screen.getByText(/42\.50/)).toBeInTheDocument();
    expect(screen.getByText(/10\.00/)).toBeInTheDocument();
  });

  it("shows an em dash when sub type is empty", () => {
    render(
      <MantineProvider theme={theme}>
        <AccountDetailRows account={{ ...account, subType: "" }} />
      </MantineProvider>,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
