import { Box, Table, rem } from "@mantine/core";
import type { CategoryRow } from "./categorySegments.js";
import { enabledStatusChip } from "./categoryDisplay.js";

type SubcategoriesTableProps = {
  rows: CategoryRow[];
};

/** Shared column layout so each parent’s table lines up with the others. */
export function SubcategoriesTable({ rows }: SubcategoriesTableProps) {
  return (
    <Table
      highlightOnHover
      withTableBorder
      withColumnBorders
      verticalSpacing="xs"
      horizontalSpacing="md"
      fz="sm"
      style={{ tableLayout: "fixed", width: "100%" }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th style={{ width: rem(130) }}>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map(({ category: row, depth }) => (
          <Table.Tr key={row.id}>
            <Table.Td style={{ verticalAlign: "middle" }}>
              <Box
                style={{
                  paddingLeft: depth * 24,
                  borderLeft:
                    depth > 0
                      ? "2px solid var(--mantine-color-brand-3)"
                      : undefined,
                }}
              >
                {row.name}
              </Box>
            </Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>
              {enabledStatusChip(row.isDisabled)}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
