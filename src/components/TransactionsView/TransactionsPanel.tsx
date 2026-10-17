import { Box, Paper } from "@mantine/core";
import type { ReactNode } from "react";

type TransactionsPanelProps = {
  /** Optional bar above the table, e.g. filters. */
  header?: ReactNode;
  children: ReactNode;
};

export function TransactionsPanel({
  header,
  children,
}: TransactionsPanelProps) {
  return (
    <Paper
      shadow="sm"
      radius="md"
      p={0}
      withBorder
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {header ? (
        <Box
          px="md"
          py="xs"
          style={{
            backgroundColor: "var(--mantine-color-default-hover)",
            borderBottom: "1px solid var(--mantine-color-default-border)",
          }}
        >
          {header}
        </Box>
      ) : null}
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>{children}</Box>
    </Paper>
  );
}
