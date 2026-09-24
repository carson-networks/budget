import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { theme } from "../../../theme.js";
import EditAccountModal from "./Modal.js";

vi.mock("../../../hooks/useAccounts.js", async () => {
  // Use real hooks so unstable mutation object identity matches production.
  return await vi.importActual("../../../hooks/useAccounts.js");
});

vi.mock("../../../connectRPC/connect.js", () => ({
  accountClient: {
    updateAccount: vi.fn().mockResolvedValue({}),
    deleteAccount: vi.fn().mockResolvedValue({}),
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
  },
}));

const account: Account = {
  id: "acc-1",
  name: "House Fund",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "42.00",
  startingBalance: "10.00",
  integration: AccountIntegration.Manual,
};

describe("AccountSettingsBody stability", () => {
  it("does not hit maximum update depth when opened with live mutations", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const onClose = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <EditAccountModal account={account} open onClose={onClose} />
        </QueryClientProvider>
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Account settings" }),
    ).toBeInTheDocument();

    // Flush several turns; a reset-in-effect loop would throw before this.
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByRole("heading", { name: "Account settings" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
