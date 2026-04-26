import { Table, type TableProps } from "@mantine/core";

type EntityTableProps = TableProps & {
  striped?: boolean;
};

/**
 * Mantine Table with the standard entity-list chrome used across Accounts/Categories.
 * Pass `striped` for transaction-style tables.
 */
export function EntityTable({
  striped,
  style,
  ...props
}: EntityTableProps) {
  return (
    <Table
      striped={striped}
      highlightOnHover
      withTableBorder
      withColumnBorders
      verticalSpacing="xs"
      horizontalSpacing="xs"
      fz="sm"
      style={style}
      {...props}
    />
  );
}
