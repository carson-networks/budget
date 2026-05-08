import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { theme } from "../../../theme.js";
import CreateManualAccountModal from "./Modal.js";

const { mutateMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
}));

vi.mock("../../../hooks/useAccounts.js", () => ({
  AccountType: {
    UNSPECIFIED: 0,
    CASH: 1,
    CREDIT_CARDS: 2,
  },
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
});
