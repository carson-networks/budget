import { AppShell as MantineAppShell, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet, Route, Routes, MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useShellStore } from "../../stores/shell/useShellStore";
import { theme } from "../../theme.js";
import { AppSidebar } from "./AppSidebar.js";

function TestShell({
  showNavLabels,
  isMobile,
}: {
  showNavLabels: boolean;
  isMobile: boolean;
}) {
  return (
    <MantineAppShell
      padding={0}
      header={{ height: 40 }}
      navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: false, desktop: false } }}
    >
      <MantineAppShell.Header />
      <MantineAppShell.Navbar p="md">
        <AppSidebar showNavLabels={showNavLabels} isMobile={isMobile} />
      </MantineAppShell.Navbar>
      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    useShellStore.setState({ sidebarOpen: true });
  });

  it("navigates between routes and leaves the sidebar open on desktop", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <MemoryRouter initialEntries={["/budget"]}>
          <Routes>
            <Route element={<TestShell showNavLabels isMobile={false} />}>
              <Route index element={<h2>Home view</h2>} />
              <Route path="budget" element={<h2>Budget view</h2>} />
              <Route
                path="transactions"
                element={<h2>Transactions view</h2>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Budget view", level: 2 }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Home", { selector: ".mantine-NavLink-label" }),
    ).toBeInTheDocument();

    const txLabel = screen.getByText("Transactions", {
      selector: ".mantine-NavLink-label",
    });
    await user.click(txLabel.closest("a")!);

    expect(
      screen.getByRole("heading", { name: "Transactions view", level: 2 }),
    ).toBeInTheDocument();
    expect(useShellStore.getState().sidebarOpen).toBe(true);
  });

  it("closes the sidebar after navigation on mobile", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <MemoryRouter initialEntries={["/budget"]}>
          <Routes>
            <Route element={<TestShell showNavLabels isMobile />}>
              <Route index element={<h2>Home view</h2>} />
              <Route path="budget" element={<h2>Budget view</h2>} />
              <Route
                path="transactions"
                element={<h2>Transactions view</h2>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );

    const txLabel = screen.getByText("Transactions", {
      selector: ".mantine-NavLink-label",
    });
    await user.click(txLabel.closest("a")!);

    expect(
      screen.getByRole("heading", { name: "Transactions view", level: 2 }),
    ).toBeInTheDocument();
    expect(useShellStore.getState().sidebarOpen).toBe(false);
  });

  it("navigates to Home from the sidebar", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <MemoryRouter initialEntries={["/budget"]}>
          <Routes>
            <Route element={<TestShell showNavLabels isMobile={false} />}>
              <Route index element={<h2>Home view</h2>} />
              <Route path="budget" element={<h2>Budget view</h2>} />
              <Route
                path="transactions"
                element={<h2>Transactions view</h2>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );

    const homeLabel = screen.getByText("Home", {
      selector: ".mantine-NavLink-label",
    });
    await user.click(homeLabel.closest("a")!);

    expect(
      screen.getByRole("heading", { name: "Home view", level: 2 }),
    ).toBeInTheDocument();
  });
});
