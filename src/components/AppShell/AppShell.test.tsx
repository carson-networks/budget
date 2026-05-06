import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShellStore } from "../../stores/shell/useShellStore";
import { theme } from "../../theme.js";
import AppShell from "./AppShell.js";

const useMediaQueryMock = vi.fn(() => false);

vi.mock("@mantine/hooks", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...mod,
    useMediaQuery: () => useMediaQueryMock() as ReturnType<typeof mod.useMediaQuery>,
  };
});

describe("AppShell", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
    useShellStore.setState({ sidebarOpen: false });
    useMediaQueryMock.mockReturnValue(false);
  });

  function renderShell(initialPath = "/budget") {
    return render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route
                path="budget"
                element={<h2>Budget view</h2>}
              />
              <Route
                path="transactions"
                element={<h2>Transactions view</h2>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );
  }

  it("renders shell chrome and nested outlet content", () => {
    useShellStore.setState({ sidebarOpen: true });
    renderShell("/budget");
    expect(
      screen.getByRole("heading", { level: 3, name: "Budget" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Budget view", level: 2 }),
    ).toBeInTheDocument();
  });

  it("navigates between child routes from the sidebar", async () => {
    const user = userEvent.setup();
    useShellStore.setState({ sidebarOpen: true });
    renderShell("/budget");

    await user.click(
      screen.getByText("Transactions", {
        selector: ".mantine-NavLink-label",
      }).closest("a")!,
    );

    expect(
      screen.getByRole("heading", { name: "Transactions view", level: 2 }),
    ).toBeInTheDocument();
  });

  it("starts with the mobile drawer closed and opens it from the burger", async () => {
    const user = userEvent.setup();
    useMediaQueryMock.mockReturnValue(true);
    renderShell("/budget");

    expect(useShellStore.getState().sidebarOpen).toBe(false);

    await user.click(
      screen.getByRole("button", { name: "Toggle navigation menu" }),
    );
    expect(useShellStore.getState().sidebarOpen).toBe(true);

    await user.click(
      screen.getByText("Transactions", {
        selector: ".mantine-NavLink-label",
      }).closest("a")!,
    );
    expect(
      screen.getByRole("heading", { name: "Transactions view", level: 2 }),
    ).toBeInTheDocument();
  });
});
