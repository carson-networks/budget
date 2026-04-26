import { Box, Table as MantineTable, type ComboboxData } from "@mantine/core";
import {
  useUpdateTransactionCategory,
  type Transaction,
} from "../../hooks/useTransactions";
import type { Category } from "../../hooks/useCategories";
import { formatCurrency } from "../../utils/format";
import { EntityTable } from "../shared/EntityTable";
import { CategorySelect } from "./CategorySelect";

/** Mantine `ActionIcon` `size="md"` height — matches Categories/Accounts settings column. */
const TABLE_LEADING_CELL_HEIGHT_PX = 28;

type TableProps = {
  paginatedTransactions: Transaction[];
  accountNameById: Map<string, string>;
  categories: Category[];
  categorySelectData: ComboboxData;
  updateCategory: ReturnType<typeof useUpdateTransactionCategory>;
  onRowOpen: (txn: Transaction) => void;
};

export function Table({
  paginatedTransactions,
  accountNameById,
  categories,
  categorySelectData,
  updateCategory,
  onRowOpen,
}: TableProps) {
  return (
    <EntityTable striped>
      <MantineTable.Thead>
        <MantineTable.Tr>
          <MantineTable.Th style={{ width: 48 }} />
          <MantineTable.Th>Transaction</MantineTable.Th>
          <MantineTable.Th>Account</MantineTable.Th>
          <MantineTable.Th style={{ minWidth: 150, maxWidth: 250 }}>
            Category
          </MantineTable.Th>
          <MantineTable.Th>Amount</MantineTable.Th>
        </MantineTable.Tr>
      </MantineTable.Thead>
      <MantineTable.Tbody>
        {paginatedTransactions.map((txn) => {
          const accountName =
            accountNameById.get(txn.accountId) ?? txn.accountId;
          const currentId = txn.categoryId;

          return (
            <MantineTable.Tr
              key={txn.id}
              style={{ cursor: "pointer" }}
              onClick={() => onRowOpen(txn)}
            >
              <MantineTable.Td
                style={{ verticalAlign: "middle", textAlign: "center" }}
              >
                <Box
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: TABLE_LEADING_CELL_HEIGHT_PX,
                  }}
                >
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: "var(--mantine-color-brand-1)",
                      borderRadius: 5,
                      flexShrink: 0,
                    }}
                  />
                </Box>
              </MantineTable.Td>
              <MantineTable.Td style={{ verticalAlign: "middle" }}>
                {txn.transactionName}
              </MantineTable.Td>
              <MantineTable.Td style={{ verticalAlign: "middle" }}>
                {accountName}
              </MantineTable.Td>
              <MantineTable.Td
                style={{
                  verticalAlign: "middle",
                  minWidth: 150,
                  maxWidth: 250,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <CategorySelect
                  categories={categories}
                  categorySelectData={categorySelectData}
                  currentCategoryId={currentId}
                  updatePending={updateCategory.isPending}
                  onCategoryChange={(categoryId) => {
                    updateCategory.mutate({
                      transactionId: txn.id,
                      categoryId,
                    });
                  }}
                />
              </MantineTable.Td>
              <MantineTable.Td fw={500} style={{ verticalAlign: "middle" }}>
                {formatCurrency(txn.amount)}
              </MantineTable.Td>
            </MantineTable.Tr>
          );
        })}
      </MantineTable.Tbody>
    </EntityTable>
  );
}
