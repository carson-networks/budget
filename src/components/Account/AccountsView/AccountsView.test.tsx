import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import { wireAccount } from "../../../test/wire.js";

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock(import("react-router-dom"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const api = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../../connectRPC/connect.js", () => ({
  accountClient: api,
}));

vi.mock(import("../../../plaid/usePlaidLinkToken.js"), () => ({
  prefetchPlaidLinkToken: vi.fn(),
}));

vi.mock(import("../../../plaid/useConnectedAccountFlow.js"), () => ({
  useConnectedAccountFlow: () => ({
    startLink: vi.fn(),
    tokenError: null,
    exchangeError: null,
    dismissTokenError: vi.fn(),
    dismissExchangeError: vi.fn(),
  }),
}));

vi.mock(import("../CreateManualAccountModal/Modal.js"), () => ({
  default: () => <></>,
}));

vi.mock(import("../EditAccountModal/Modal.js"), () => ({
  default: ({
    open,
    account,
  }: {
    open: boolean;
    account: Account | null;
  }) =>
    open && account ? (
      <div role="dialog" aria-label="Account settings">
        Settings for {account.name}
      </div>
    ) : (
      <></>
    ),
}));

import AccountsView from "./AccountsView.js";

const cashAccount: Account = {
  id: "acc-budget",
  name: "House Fund",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "42.00",
  startingBalance: "0",
  integration: AccountIntegration.Manual,
};

function mockAccounts(accounts: Account[]) {
  api.listAccounts.mockResolvedValue({ accounts: accounts.map(wireAccount) });
}

function renderAccountsView() {
  return renderWithProviders(<AccountsView />);
}

describe("AccountsView", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    api.listAccounts.mockReset();
    mockAccounts([]);
  });

  it("shows loading state while accounts are loading", () => {
    api.listAccounts.mockReturnValue(new Promise(() => {}));

    renderAccountsView();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Accounts" })).not.toBeInTheDocument();
  });

  it("shows an error alert when the accounts query fails", async () => {
    api.listAccounts.mockRejectedValue(new Error("network failed"));

    renderAccountsView();

    expect(await screen.findByText("network failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows an empty-state hint when there are no accounts", async () => {
    renderAccountsView();

    expect(
      await screen.findByText(/No accounts yet\. Use the \+ button to add one\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeInTheDocument();
  });

  it("renders segment headers and account rows when accounts exist", async () => {
    mockAccounts([cashAccount]);

    renderAccountsView();

    expect(await screen.findByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("House Fund")).toBeInTheDocument();
    expect(screen.queryByText(/No accounts yet/)).not.toBeInTheDocument();
  });

  it("navigates to the account detail route when a row is clicked", async () => {
    const user = userEvent.setup();
    mockAccounts([cashAccount]);

    renderAccountsView();

    await user.click(await screen.findByText("House Fund"));

    expect(navigateMock).toHaveBeenCalledWith("/accounts/acc-budget");
  });

  it("opens account settings when the row settings button is clicked", async () => {
    const user = userEvent.setup();
    mockAccounts([cashAccount]);

    renderAccountsView();

    const settings = await screen.findByRole("button", {
      name: "Settings for House Fund",
    });
    expect(
      screen.queryByRole("dialog", { name: "Account settings" }),
    ).not.toBeInTheDocument();

    await user.click(settings);

    expect(
      screen.getByRole("dialog", { name: "Account settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Settings for House Fund")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
