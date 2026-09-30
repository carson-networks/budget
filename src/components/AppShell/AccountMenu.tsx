import { ActionIcon, Menu } from "@mantine/core";
import type { ReactNode } from "react";
import {
  IconCheck,
  IconDeviceDesktop,
  IconMoon,
  IconPalette,
  IconSun,
  IconUser,
} from "@tabler/icons-react";
import type { ColorSchemePreference } from "../../persistence/shell/types.js";
import { useShellStore } from "../../stores/shell/useShellStore";

export function AccountMenu() {
  const colorSchemePreference = useShellStore((s) => s.colorSchemePreference);
  const setColorSchemePreference = useShellStore(
    (s) => s.setColorSchemePreference,
  );

  const schemeItem = (
    value: ColorSchemePreference,
    label: string,
    icon: ReactNode,
  ) => (
    <Menu.Item
      key={value}
      leftSection={icon}
      rightSection={
        colorSchemePreference === value ? (
          <IconCheck size={14} aria-hidden />
        ) : (
          <span style={{ width: 14 }} aria-hidden />
        )
      }
      onClick={() => setColorSchemePreference(value)}
    >
      {label}
    </Menu.Item>
  );

  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="light"
          size="lg"
          color="brand"
          aria-label="Account"
          aria-haspopup="menu"
        >
          <IconUser size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Sub closeDelay={200} openDelay={0}>
          <Menu.Sub.Target>
            <Menu.Sub.Item
              leftSection={<IconPalette size={16} aria-hidden />}
            >
              Appearance
            </Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {schemeItem(
              "light",
              "Light",
              <IconSun size={16} aria-hidden />,
            )}
            {schemeItem("dark", "Dark", <IconMoon size={16} aria-hidden />)}
            {schemeItem(
              "auto",
              "System",
              <IconDeviceDesktop size={16} aria-hidden />,
            )}
          </Menu.Sub.Dropdown>
        </Menu.Sub>
      </Menu.Dropdown>
    </Menu>
  );
}
