import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  Title,
  ActionIcon,
  NavLink,
  Box,
} from "@mantine/core";
import { IconReceipt, IconBuildingBank, IconUser } from "@tabler/icons-react";

export default function AppShell() {
  const [opened, setOpened] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpened(false);
  };

  return (
    <MantineAppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
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
              aria-label="open navigation menu"
            />
            <Title order={3} fw={700} c="teal.7">
              Budget
            </Title>
          </Group>
          <ActionIcon variant="light" size="lg" color="teal" aria-label="account">
            <IconUser size={20} />
          </ActionIcon>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <MantineAppShell.Section grow>
          <NavLink
            label="Transactions"
            leftSection={<IconReceipt size={20} />}
            active={location.pathname === "/transactions"}
            onClick={() => handleNavigate("/transactions")}
            variant="light"
            color="teal"
          />
          <NavLink
            label="Accounts"
            leftSection={<IconBuildingBank size={20} />}
            active={location.pathname === "/accounts"}
            onClick={() => handleNavigate("/accounts")}
            variant="light"
            color="teal"
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
