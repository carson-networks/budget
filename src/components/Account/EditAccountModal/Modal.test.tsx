import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import EditAccountModal from "./Modal.js";

const api = vi.hoisted(() => ({
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  listAccounts: vi.fn(),
}));

vi.mock("../../../connectRPC/connect.js", () => ({
  accountClient: api,
  transactionClient: { listTransactions: vi.fn() },
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
    vi.resetAllMocks();
    api.updateAccount.mockResolvedValue({});
    api.deleteAccount.mockResolvedValue({});
  });

  it("renders editable account settings when open", () => {
    renderWithProviders(
      <EditAccountModal account={account} open onClose={vi.fn()} />
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
    ).toHaveValue("10.00");
    expect(
      screen.getByRole("textbox", { name: /starting balance/i }).parentElement,
    ).toHaveTextContent("$");
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("keeps $ visible while editing starting balance and submits the decimal", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditAccountModal account={account} open onClose={vi.fn()} />
    );

    const starting = screen.getByRole("textbox", { name: /starting balance/i });
    expect(starting).toHaveValue("10.00");
    expect(starting.parentElement).toHaveTextContent("$");

    await user.clear(starting);
    await user.type(starting, "25.559");

    expect(starting).toHaveValue("25.55");
    expect(starting.parentElement).toHaveTextContent("$");

    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() =>
      expect(api.updateAccount).toHaveBeenCalledWith(
        expect.objectContaining({ startingBalance: "25.55" }),
      ),
    );
  });

  it("does not render account details when closed with a null account", () => {
    renderWithProviders(
      <EditAccountModal account={null} open={false} onClose={vi.fn()} />
    );

    expect(
      screen.queryByRole("heading", { name: "Account settings" }),
    ).not.toBeInTheDocument();
  });

  it("saves edited fields through updateAccount", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <EditAccountModal account={account} open onClose={onClose} />
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "Rainy Day");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(api.updateAccount).toHaveBeenCalledExactlyOnceWith({
      id: "acc-1",
      name: "Rainy Day",
      subType: "Checking",
      startingBalance: "10.00",
    });
  });

  it("opens a separate delete confirm modal while settings stays open", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderWithProviders(
      <EditAccountModal account={account} open onClose={vi.fn()} />
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
    renderWithProviders(
      <EditAccountModal account={account} open onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(api.deleteAccount).toHaveBeenCalledExactlyOnceWith({ id: "acc-1" });
  });

  it("cancels delete confirm without mutating and keeps settings open", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onClose = vi.fn();

    renderWithProviders(
      <EditAccountModal account={account} open onClose={onClose} />
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
    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("trims fields and ignores a submit while required fields are blank", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditAccountModal account={account} open onClose={vi.fn()} />,
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "   ");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, " Renamed ");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() =>
      expect(api.updateAccount).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Renamed" }),
      ),
    );
  });

  it("shows the server error and stays open when saving fails", async () => {
    const user = userEvent.setup();
    api.updateAccount.mockRejectedValue(new Error("Save failed"));
    const onClose = vi.fn();
    renderWithProviders(
      <EditAccountModal account={account} open onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
