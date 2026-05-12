import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { AddAccountMenu } from "./AddAccountMenu.js";

function renderMenu(ui: ReactElement) {
  return render(<MantineProvider theme={theme}>{ui}</MantineProvider>);
}

describe("AddAccountMenu", () => {
  it("calls onManualOpen when Add manual account is chosen", async () => {
    const user = userEvent.setup();
    const onManualOpen = vi.fn();
    const onConnectBankOpen = vi.fn();

    renderMenu(
      <AddAccountMenu
        onManualOpen={onManualOpen}
        onConnectBankOpen={onConnectBankOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() =>
      expect(document.querySelectorAll("[data-menu-item]").length).toBe(2),
    );
    await user.click(
      document.querySelectorAll("[data-menu-item]")[0] as HTMLElement,
    );

    expect(onManualOpen).toHaveBeenCalledTimes(1);
    expect(onConnectBankOpen).not.toHaveBeenCalled();
  });

  it("calls onConnectBankOpen when Connect bank is chosen", async () => {
    const user = userEvent.setup();
    const onManualOpen = vi.fn();
    const onConnectBankOpen = vi.fn();

    renderMenu(
      <AddAccountMenu
        onManualOpen={onManualOpen}
        onConnectBankOpen={onConnectBankOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() =>
      expect(document.querySelectorAll("[data-menu-item]").length).toBe(2),
    );
    await user.click(
      document.querySelectorAll("[data-menu-item]")[1] as HTMLElement,
    );

    expect(onConnectBankOpen).toHaveBeenCalledTimes(1);
    expect(onManualOpen).not.toHaveBeenCalled();
  });

  it("calls onAddAccountMenuOpen when the + button is pressed", async () => {
    const user = userEvent.setup();
    const onAddAccountMenuOpen = vi.fn();

    renderMenu(
      <AddAccountMenu
        onManualOpen={vi.fn()}
        onAddAccountMenuOpen={onAddAccountMenuOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add account" }));

    expect(onAddAccountMenuOpen).toHaveBeenCalledTimes(1);
  });
});
