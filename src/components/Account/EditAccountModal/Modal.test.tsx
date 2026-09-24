import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { theme } from "../../../theme.js";
import EditAccountModal from "./Modal.js";

const { mutateUpdateMock, resetUpdateMock, mutateDeleteMock, resetDeleteMock } =
  vi.hoisted(() => ({
    mutateUpdateMock: vi.fn(),
    resetUpdateMock: vi.fn(),
    mutateDeleteMock: vi.fn(),
    resetDeleteMock: vi.fn(),
  }));

vi.mock("../../../hooks/useAccounts.js", () => ({
  useUpdateAccount: () => ({
    mutate: mutateUpdateMock,
    reset: resetUpdateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteAccount: () => ({
    mutate: mutateDeleteMock,
    reset: resetDeleteMock,
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
    mutateUpdateMock.mockReset();
    resetUpdateMock.mockReset();
    mutateDeleteMock.mockReset();
    resetDeleteMock.mockReset();
  });

  it("renders editable account settings when open", () => {
    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Account settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "House Fund",
    );
    expect(screen.getByRole("textbox", { name: /sub type/i })).toHaveValue(
      "Checking",
    );
    expect(
      screen.getByRole("textbox", { name: /starting balance/i }),
    ).toHaveValue("$10.00");
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("shows a raw decimal while editing starting balance and submits the decimal", async () => {
    const user = userEvent.setup();
    mutateUpdateMock.mockImplementation(
      (_body: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={vi.fn()} />
      </MantineProvider>,
    );

    const starting = screen.getByRole("textbox", { name: /starting balance/i });
    expect(starting).toHaveValue("$10.00");

    await user.click(starting);
    expect(starting).toHaveValue("10.00");

    await user.clear(starting);
    await user.type(starting, "25.50");
    await user.tab();

    expect(starting).toHaveValue("$25.50");

    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mutateUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        startingBalance: "25.50",
      }),
      expect.any(Object),
    );
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

  it("saves edited fields through updateAccount", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mutateUpdateMock.mockImplementation(
      (_body: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={onClose} />
      </MantineProvider>,
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "Rainy Day");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mutateUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "acc-1",
        name: "Rainy Day",
        subType: "Checking",
        startingBalance: "10.00",
      }),
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens a separate delete confirm modal while settings stays open", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(
      screen.getByRole("heading", { name: "Account settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Delete account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete “House Fund”?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("confirms deletion from the second modal and closes settings", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onClose = vi.fn();
    mutateDeleteMock.mockImplementation(
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
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mutateDeleteMock).toHaveBeenCalledWith("acc-1", expect.any(Object));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels delete confirm without mutating and keeps settings open", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onClose = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <EditAccountModal account={account} open onClose={onClose} />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(
      screen.getByRole("heading", { name: "Delete account" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Delete account" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Account settings" }),
    ).toBeInTheDocument();
    expect(mutateDeleteMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
