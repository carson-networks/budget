import {
  Box,
  Paper,
  useComputedColorScheme,
  useMantineTheme,
  type PaperProps,
} from "@mantine/core";
import type { ReactNode } from "react";

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
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");

  const headerBarStyle =
    colorScheme === "dark"
      ? {
          backgroundColor: theme.colors.dark[6],
          borderBottom: `1px solid ${theme.colors.dark[4]}`,
        }
      : {
          backgroundColor: theme.colors.gray[0],
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
        };

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
