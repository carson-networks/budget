import { useState, type ReactNode } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  Title,
  ActionIcon,
  NavLink,
  Box,
  Tooltip,
  rem,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconLayoutGrid,
  IconReceipt,
  IconBuildingBank,
  IconCategory,
  IconUser,
} from "@tabler/icons-react";

const NAV_EXPANDED_PX = 260;
const NAV_COLLAPSED_PX = 72;

/** Below `sm`: mobile drawer. At `sm+`: desktop rail toggles width only (icons stay). */
const MOBILE_MAX = "(max-width: 47.99em)";

type SidebarNavItemProps = {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  showLabels: boolean;
};

function SidebarNavItem({
  label,
  icon,
  active,
  onClick,
  showLabels,
}: SidebarNavItemProps) {
  return (
    <Tooltip label={label} position="right" offset={8} disabled={showLabels}>
      <NavLink
        aria-label={!showLabels ? label : undefined}
        label={label}
        leftSection={icon}
        active={active}
        onClick={onClick}
        variant="light"
        color="brand"
        styles={{
          root: {
            justifyContent: showLabels ? undefined : "center",
            borderRadius: rem(8),
          },
          body: showLabels ? undefined : { display: "none" },
          section: showLabels ? undefined : { marginInlineEnd: 0 },
        }}
      />
    </Tooltip>
  );
}

export default function AppShell() {
  const [opened, setOpened] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_MAX);

  const showNavLabels = isMobile || opened;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setOpened(false);
  };

  return (
    <MantineAppShell
      header={{ height: 64 }}
      navbar={{
        width: {
          base: "100%",
          sm: opened ? NAV_EXPANDED_PX : NAV_COLLAPSED_PX,
        },
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: false },
      }}
      padding="md"
      styles={{
        header: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          borderBottom: "1px solid rgba(0,0,0,0.04)",
        },
        navbar: {
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
        },
      }}
    >
      <MantineAppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="md">
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
              aria-label={
                isMobile
                  ? "Toggle navigation menu"
                  : opened
                    ? "Collapse sidebar"
                    : "Expand sidebar"
              }
            />
            <Title order={3} fw={700} c="brand.7">
              Budget
            </Title>
          </Group>
          <ActionIcon variant="light" size="lg" color="brand" aria-label="account">
            <IconUser size={20} />
          </ActionIcon>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p={{ base: "md", sm: opened ? "md" : "xs" }}>
        <MantineAppShell.Section grow>
          <SidebarNavItem
            label="Budget"
            icon={<IconLayoutGrid size={20} />}
            active={location.pathname === "/budget"}
            onClick={() => handleNavigate("/budget")}
            showLabels={showNavLabels}
          />
          <SidebarNavItem
            label="Transactions"
            icon={<IconReceipt size={20} />}
            active={location.pathname === "/transactions"}
            onClick={() => handleNavigate("/transactions")}
            showLabels={showNavLabels}
          />
          <SidebarNavItem
            label="Accounts"
            icon={<IconBuildingBank size={20} />}
            active={location.pathname === "/accounts"}
            onClick={() => handleNavigate("/accounts")}
            showLabels={showNavLabels}
          />
          <SidebarNavItem
            label="Categories"
            icon={<IconCategory size={20} />}
            active={location.pathname === "/categories"}
            onClick={() => handleNavigate("/categories")}
            showLabels={showNavLabels}
          />
        </MantineAppShell.Section>
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
