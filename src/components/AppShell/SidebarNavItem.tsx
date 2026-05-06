import type { ReactNode } from "react";
import { NavLink, rem, Tooltip } from "@mantine/core";

type SidebarNavItemProps = {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  showLabels: boolean;
};

export function SidebarNavItem({
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
