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
            justifyContent: "center",
            borderRadius: rem(8),
          },
          body: {
            maxWidth: showLabels ? rem(260) : 0,
            whiteSpace: "nowrap",
            textOverflow: "clip",
            transition:
              "max-width var(--app-shell-transition-duration) var(--app-shell-transition-timing-function)",
          },
          section: {
            flexShrink: 0,
            marginInlineEnd: showLabels ? "var(--mantine-spacing-sm)" : 0,
            transition:
              "margin-inline-end var(--app-shell-transition-duration) var(--app-shell-transition-timing-function)",
          },
        }}
      />
    </Tooltip>
  );
}
