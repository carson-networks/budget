import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useShellStore } from "../../stores/shell/useShellStore";
import { theme } from "../../theme.js";
import { AppHeader } from "./AppHeader.js";

describe("AppHeader", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
    useShellStore.setState({ sidebarOpen: true });
  });

  it("renders brand title and desktop sidebar control", () => {
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AppHeader isMobile={false} />
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Budget" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("uses the mobile burger aria-label when isMobile", () => {
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AppHeader isMobile />
      </MantineProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Toggle navigation menu" }),
    ).toBeInTheDocument();
  });

  it("toggles the shell store when the desktop burger is clicked", async () => {
    const user = userEvent.setup();
    useShellStore.setState({ sidebarOpen: true });
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AppHeader isMobile={false} />
      </MantineProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    );
    expect(useShellStore.getState().sidebarOpen).toBe(false);
  });

  it("toggles the shell store when the mobile burger is clicked", async () => {
    const user = userEvent.setup();
    useShellStore.setState({ sidebarOpen: false });
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <AppHeader isMobile />
      </MantineProvider>,
    );

    expect(useShellStore.getState().sidebarOpen).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Toggle navigation menu" }),
    );
    expect(useShellStore.getState().sidebarOpen).toBe(true);
  });
});
