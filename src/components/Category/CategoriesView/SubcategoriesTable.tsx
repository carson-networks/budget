import { Table, rem } from "@mantine/core";
import type { Category } from "../../../models";
import { enabledStatusChip } from "./categoryDisplay.js";

type SubcategoriesTableProps = {
  categories: Category[];
};

/** Shared column layout so each parent’s table lines up with the others. */
export function SubcategoriesTable({ categories }: SubcategoriesTableProps) {
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
        {categories.map((row) => (
          <Table.Tr key={row.id}>
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
