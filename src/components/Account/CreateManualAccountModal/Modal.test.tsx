import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountType } from "../../../connectRPC/types.js";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import CreateManualAccountModal from "./Modal.js";

const api = vi.hoisted(() => ({
  createAccount: vi.fn(),
  listAccounts: vi.fn(),
}));

vi.mock("../../../connectRPC/connect.js", () => ({
  accountClient: {
    createAccount: api.createAccount,
    listAccounts: api.listAccounts,
  },
}));

function renderModal(onClose = vi.fn()) {
  renderWithProviders(<CreateManualAccountModal open onClose={onClose} />);
  return onClose;
}

describe("CreateManualAccountModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.createAccount.mockResolvedValue({});
    api.listAccounts.mockResolvedValue({ accounts: [] });
  });

  it("submits manual account fields to the create RPC and closes", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "  My account ");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");

    const balance = screen.getByRole("textbox", { name: /starting balance/i });
    await user.clear(balance);
    await user.type(balance, "100.00");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.createAccount).toHaveBeenCalledExactlyOnceWith({
      name: "My account",
      type: AccountType.CASH,
      subType: "Checking",
      startingBalance: "100.00",
    });
  });

  it("clears the fields after closing", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Temp");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "5");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(""),
    );
    expect(screen.getByRole("textbox", { name: /sub type/i })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /starting balance/i })).toHaveValue("");
  });

  it("shows the server error and keeps the form open", async () => {
    const user = userEvent.setup();
    api.createAccount.mockRejectedValue(new Error("Name taken"));
    const onClose = renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Dup");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Name taken")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps $ visible on starting balance and submits the decimal", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "My account");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");

    const starting = screen.getByRole("textbox", { name: /starting balance/i });
    expect(starting.parentElement).toHaveTextContent("$");

    await user.type(starting, "25.559");
    expect(starting).toHaveValue("25.55");
    expect(starting.parentElement).toHaveTextContent("$");

    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(api.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ startingBalance: "25.55" }),
      ),
    );
  });

  it("disables Create account when required fields are empty", () => {
    renderModal();

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
    expect(api.createAccount).not.toHaveBeenCalled();
  });

  it("keeps Create disabled until name, sub type, and starting balance are non-empty", async () => {
    const user = userEvent.setup();
    renderModal();

    const submit = screen.getByRole("button", { name: /create account/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Rainy day");
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Savings");
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "25");
    expect(submit).not.toBeDisabled();
  });

  it("disables Create when name is only whitespace", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "   ");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "10");

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("disables Create when sub type is only whitespace", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Valid name");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "  \t  ");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "0");

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("disables Create when starting balance is only whitespace", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Valid name");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "   ");

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("does not call mutate when the form is submitted with invalid fields", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Only name");
    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(api.createAccount).not.toHaveBeenCalled();
  });
});
