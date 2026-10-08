import { Box, ActionIcon, Table, rem } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import type { Category } from "../../../models";
import { enabledStatusChip } from "./categoryDisplay.js";

type SubcategoriesTableProps = {
  categories: Category[];
  onRowSettings: (category: Category) => void;
};

/** Shared column layout so each parent’s table lines up with the others. */
export function SubcategoriesTable({
  categories,
  onRowSettings,
}: SubcategoriesTableProps) {
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
          <Table.Th style={{ width: rem(48) }} />
          <Table.Th>Name</Table.Th>
          <Table.Th style={{ width: rem(130) }}>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {categories.map((row) => (
          <Table.Tr key={row.id}>
            <Table.Td
              style={{ verticalAlign: "middle", textAlign: "center" }}
            >
              <Box
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  aria-label={`Settings for ${row.name}`}
                  onClick={() => onRowSettings(row)}
                >
                  <IconSettings size={18} />
                </ActionIcon>
              </Box>
            </Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>{row.name}</Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>
              {enabledStatusChip(row.isDisabled)}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
