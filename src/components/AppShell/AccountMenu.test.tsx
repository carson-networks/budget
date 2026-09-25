import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShellStore } from "../../stores/shell/useShellStore";
import { theme } from "../../theme.js";
import { AccountMenu } from "./AccountMenu.js";

describe("AccountMenu", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
  });

  it("renders the account menu trigger", () => {
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AccountMenu />
      </MantineProvider>,
    );
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });

  it("lists appearance options under an Appearance submenu", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AccountMenu />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Account" }));

    // Mantine keeps the portaled dropdown at display:none in jsdom until
    // layout runs; include hidden nodes so menu items are queryable.
    const menuOpts = { hidden: true } as const;

    const appearance = await screen.findByRole("menuitem", {
      name: "Appearance",
      ...menuOpts,
    });
    expect(appearance).toBeInTheDocument();
    await user.hover(appearance);

    expect(
      await screen.findByRole("menuitem", { name: "Light", ...menuOpts }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("menuitem", { name: "Dark", ...menuOpts }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("menuitem", { name: "System", ...menuOpts }),
    ).toBeInTheDocument();
  });

  it("invokes setColorSchemePreference from the Appearance submenu", async () => {
    const user = userEvent.setup();
    const setColorSchemePreference = vi.spyOn(
      useShellStore.getState(),
      "setColorSchemePreference",
    );
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AccountMenu />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Account" }));
    const appearance = await screen.findByRole("menuitem", {
      name: "Appearance",
      hidden: true,
    });
    await user.hover(appearance);
    await user.click(
      await screen.findByRole("menuitem", {
        name: "Dark",
        hidden: true,
      }),
    );

    expect(setColorSchemePreference).toHaveBeenCalledWith("dark");
  });
});
