import { Burger, Group, Title } from "@mantine/core";
import { useShellStore } from "../../stores/shell/useShellStore";
import { AccountMenu } from "./AccountMenu";

type AppHeaderProps = {
  isMobile: boolean;
};

export function AppHeader({ isMobile }: AppHeaderProps) {
  const sidebarOpen = useShellStore((s) => s.sidebarOpen);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);

  return (
    <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
      <Group gap="md" wrap="nowrap">
        <Burger
          opened={sidebarOpen}
          onClick={toggleSidebar}
          size="sm"
          aria-label={
            isMobile
              ? "Toggle navigation menu"
              : sidebarOpen
                ? "Collapse sidebar"
                : "Expand sidebar"
          }
        />
        <Title order={3} fw={700} c="brand.7">
          Budget
        </Title>
      </Group>
      <AccountMenu />
    </Group>
  );
}
