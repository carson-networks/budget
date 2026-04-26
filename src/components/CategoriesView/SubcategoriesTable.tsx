import { Box, ActionIcon, Table } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { type Category } from "../../hooks/useCategories";
import type { CategoryRow } from "../../utils/categorySegments";
import { EntityTable } from "../shared/EntityTable";
import { enabledStatusChip } from "../shared/CategoryDisplay";

type SubcategoriesTableProps = {
  rows: CategoryRow[];
  onRowSettings: (category: Category) => void;
};

/** Shared column layout so each parent’s table lines up with the others. */
export function SubcategoriesTable({
  rows,
  onRowSettings,
}: SubcategoriesTableProps) {
  return (
    <EntityTable style={{ tableLayout: "fixed", width: "100%" }}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: 48 }} />
          <Table.Th>Name</Table.Th>
          <Table.Th style={{ width: 130 }}>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map(({ category: row, depth }) => (
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
    </EntityTable>
  );
}
