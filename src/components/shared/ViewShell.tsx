import { Box, Title, type TitleProps } from "@mantine/core";
import type { ReactNode } from "react";

type ViewShellProps = {
  title: string;
  children: ReactNode;
  titleProps?: Partial<TitleProps>;
};

export function ViewShell({ title, children, titleProps }: ViewShellProps) {
  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title order={4} mb="md" c="dark.6" {...titleProps}>
        {title}
      </Title>
      {children}
    </Box>
  );
}
