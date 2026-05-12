import { useLocation, useNavigate } from "react-router-dom";
import { AppShell as MantineAppShell } from "@mantine/core";
import { useShellStore } from "../../stores/shell/useShellStore";
import { NAV_ITEMS } from "./navItems";
import { SidebarNavItem } from "./SidebarNavItem";

function isRouteActive(pathname: string, navPath: string): boolean {
  if (navPath === "/") {
    return pathname === "/";
  }
  return pathname === navPath || pathname.startsWith(`${navPath}/`);
}

type AppSidebarProps = {
  showNavLabels: boolean;
  isMobile: boolean;
};

export function AppSidebar({ showNavLabels, isMobile }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const setSidebarOpen = useShellStore((s) => s.setSidebarOpen);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <MantineAppShell.Section grow>
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
        <SidebarNavItem
          key={path}
          label={label}
          icon={<Icon size={20} />}
          active={isRouteActive(location.pathname, path)}
          onClick={() => handleNavigate(path)}
          showLabels={showNavLabels}
        />
      ))}
    </MantineAppShell.Section>
  );
}
