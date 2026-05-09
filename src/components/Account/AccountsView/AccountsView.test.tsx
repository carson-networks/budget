import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { theme } from "../../../theme.js";

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

vi.mock(import("../../../hooks/useAccounts.js"), () => ({
  useAllAccounts: vi.fn(),
}));

vi.mock(import("../CreateManualAccountModal/Modal.js"), () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <span data-testid="manual-account-modal-open" /> : <></>,
}));

vi.mock(import("../CreateConnectedAccountModal/Modal.js"), () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <span data-testid="connected-account-modal-open" /> : <></>,
}));

import { useAllAccounts } from "../../../hooks/useAccounts.js";
import AccountsView from "./AccountsView.js";

const cashAccount: Account = {
  id: "acc-budget",
  name: "House Fund",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "42.00",
  startingBalance: "0",
};

function mockAccountQuery(
  partial: Partial<ReturnType<typeof useAllAccounts>>,
) {
  vi.mocked(useAllAccounts).mockReturnValue({
    accounts: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    status: "success",
    ...partial,
  } as ReturnType<typeof useAllAccounts>);
}

function renderAccountsView() {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter>
        <AccountsView />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("AccountsView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockAccountQuery({
      accounts: [],
      isLoading: false,
      error: null,
    });
  });

  it("shows loading state while accounts are loading", () => {
    mockAccountQuery({ isLoading: true, accounts: [] });

    renderAccountsView();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Accounts" })).not.toBeInTheDocument();
  });

  it("shows an error alert when the accounts query fails", () => {
    mockAccountQuery({
      isLoading: false,
      error: new Error("network failed"),
      accounts: [],
    });

    renderAccountsView();

    expect(screen.getByText("network failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows an empty-state hint when there are no accounts", () => {
    renderAccountsView();

    expect(
      screen.getByText(/No accounts yet\. Use the \+ button to add one\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeInTheDocument();
  });

  it("renders segment headers and account rows when accounts exist", () => {
    mockAccountQuery({ accounts: [cashAccount] });

    renderAccountsView();

    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("House Fund")).toBeInTheDocument();
    expect(screen.queryByText(/No accounts yet/)).not.toBeInTheDocument();
  });

  it("navigates to the account detail route when a row is clicked", async () => {
    const user = userEvent.setup();
    mockAccountQuery({ accounts: [cashAccount] });

    renderAccountsView();

    await user.click(screen.getByText("House Fund"));

    expect(navigateMock).toHaveBeenCalledWith("/accounts/acc-budget");
  });

  it("opens the manual account modal from the add menu", async () => {
    const user = userEvent.setup();
    renderAccountsView();

    await user.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() =>
      expect(document.querySelectorAll("[data-menu-item]").length).toBe(2),
    );
    await user.click(
      document.querySelectorAll("[data-menu-item]")[0] as HTMLElement,
    );

    expect(screen.getByTestId("manual-account-modal-open")).toBeInTheDocument();
    expect(
      screen.queryByTestId("connected-account-modal-open"),
    ).not.toBeInTheDocument();
  });

  it("opens the connected account modal from the add menu", async () => {
    const user = userEvent.setup();
    renderAccountsView();

    await user.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() =>
      expect(document.querySelectorAll("[data-menu-item]").length).toBe(2),
    );
    await user.click(
      document.querySelectorAll("[data-menu-item]")[1] as HTMLElement,
    );

    expect(screen.getByTestId("connected-account-modal-open")).toBeInTheDocument();
    expect(
      screen.queryByTestId("manual-account-modal-open"),
    ).not.toBeInTheDocument();
  });
});
