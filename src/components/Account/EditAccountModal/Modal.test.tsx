import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { theme } from "../../../theme.js";
import EditAccountModal from "./Modal.js";

const { mutateMock, resetMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  resetMock: vi.fn(),
}));

vi.mock("../../../hooks/useAccounts.js", () => ({
  useDeleteAccount: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isError: false,
    error: null,
  }),
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

describe("EditAccountModal", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    resetMock.mockReset();
  });

  it("renders account settings details when open", () => {
    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Account settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("House Fund")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(
      screen.getByText(/Editing account fields is not available/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("does not render account details when closed with a null account", () => {
    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={null} open={false} onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(
      screen.queryByRole("heading", { name: "Account settings" }),
    ).not.toBeInTheDocument();
  });

  it("calls onClose when Close is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={onClose} />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(resetMock).toHaveBeenCalledOnce();
  });

  it("arms delete then confirms deletion", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mutateMock.mockImplementation(
      (_id: string, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={onClose} />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByText("Delete this account?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(mutateMock).toHaveBeenCalledWith("acc-1", expect.any(Object));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels an armed delete without mutating", async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
