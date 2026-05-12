import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { theme } from "../../../theme.js";
import CreateManualAccountModal from "./Modal.js";

const { mutateMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
}));

vi.mock("../../../hooks/useAccounts.js", () => ({
  useCreateManualAccount: () => ({
    mutate: mutateMock,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe("CreateManualAccountModal", () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it("submits manual account fields to the create mutation", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={onClose} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "My account");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");

    const balance = screen.getByRole("textbox", { name: /starting balance/i });
    await user.clear(balance);
    await user.type(balance, "100.00");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My account",
        subType: "Checking",
        startingBalance: "100.00",
      }),
      expect.any(Object),
    );
  });

  it("disables Create account when required fields are empty", () => {
    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("keeps Create disabled until name, sub type, and starting balance are non-empty", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

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
    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "   ");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "10");

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("disables Create when sub type is only whitespace", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Valid name");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "  \t  ");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "0");

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("disables Create when starting balance is only whitespace", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Valid name");
    await user.type(screen.getByRole("textbox", { name: /sub type/i }), "Checking");
    await user.type(screen.getByRole("textbox", { name: /starting balance/i }), "   ");

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("does not call mutate when the form is submitted with invalid fields", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateManualAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Only name");
    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(mutateMock).not.toHaveBeenCalled();
  });
});
