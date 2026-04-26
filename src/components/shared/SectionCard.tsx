import { Box, Paper, type PaperProps } from "@mantine/core";
import type { ReactNode } from "react";

const headerBarStyle = {
  backgroundColor: "var(--mantine-color-gray-0)",
  borderBottom: "1px solid var(--mantine-color-default-border)",
} as const;

type SectionCardProps = Omit<PaperProps, "children"> & {
  header: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  header,
  children,
  shadow = "sm",
  radius = "md",
  mb = "md",
  p = 0,
  withBorder = true,
  style,
  ...rest
}: SectionCardProps) {
  return (
    <Paper
      shadow={shadow}
      radius={radius}
      mb={mb}
      p={p}
      withBorder={withBorder}
      style={{ overflow: "hidden", ...style }}
      {...rest}
    >
      <Box px="md" py="sm" style={headerBarStyle}>
        {header}
      </Box>
      {children}
    </Paper>
  );
}
