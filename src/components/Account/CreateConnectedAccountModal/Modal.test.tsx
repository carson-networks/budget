import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import CreateConnectedAccountModal from "./Modal.js";

vi.mock("./useConnectedAccountFlow.js", () => ({
  useConnectedAccountFlow: () => ({
    startLink: vi.fn(),
    preparingLink: false,
    exchanging: false,
    plaidSessionActive: false,
    tokenError: null,
    exchangeError: null,
    dismissTokenError: vi.fn(),
    dismissExchangeError: vi.fn(),
  }),
}));

describe("CreateConnectedAccountModal", () => {
  it("renders connect copy when open", () => {
    render(
      <MantineProvider theme={theme}>
        <CreateConnectedAccountModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Connect bank account", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect with plaid/i })).toBeInTheDocument();
  });
});
