import { AppShell as MantineAppShell, Box } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import { useShellStore } from "../../stores/shell/useShellStore";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

const NAV_EXPANDED_PX = 260;
const NAV_COLLAPSED_PX = 72;

const MOBILE_MAX = "(max-width: 47.99em)";

export default function AppShell() {
  const sidebarOpen = useShellStore((s) => s.sidebarOpen);
  const isMobile = useMediaQuery(MOBILE_MAX);
  const showNavLabels = Boolean(isMobile) || sidebarOpen;

  return (
    <MantineAppShell
      header={{ height: 64 }}
      navbar={{
        width: {
          base: "100%",
          sm: sidebarOpen ? NAV_EXPANDED_PX : NAV_COLLAPSED_PX,
        },
        breakpoint: "sm",
        collapsed: { mobile: !sidebarOpen, desktop: false },
      }}
      padding="md"
      styles={{
        header: {
          boxShadow: "var(--mantine-shadow-xs)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        },
        navbar: {
          boxShadow: "var(--mantine-shadow-xs)",
        },
      }}
    >
      <MantineAppShell.Header>
        <AppHeader isMobile={Boolean(isMobile)} />
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p={{ base: "md", sm: sidebarOpen ? "md" : "xs" }}>
        <AppSidebar showNavLabels={showNavLabels} isMobile={Boolean(isMobile)} />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Box
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Outlet />
        </Box>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
