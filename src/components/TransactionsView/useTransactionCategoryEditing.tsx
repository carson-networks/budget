import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Category, Transaction } from "../../models";
import { transactionMutations } from "../../queries/transactions.js";
import { CategorySelect } from "./CategorySelect.js";
import { buildTransactionCategorySelectData } from "./transactionCategorySelectData.js";

export function useTransactionCategoryEditing(
  categories: readonly Category[],
  { disabled = false }: { disabled?: boolean } = {},
) {
  const updateCategory = useMutation(transactionMutations.updateCategory);
  const data = useMemo(
    () => buildTransactionCategorySelectData(categories),
    [categories],
  );

  const renderCategory = (transaction: Transaction) => (
    <CategorySelect
      categories={categories}
      data={data}
      currentCategoryId={transaction.categoryId}
      transactionName={transaction.transactionName}
      pending={updateCategory.isPending || disabled}
      onCategoryChange={(categoryId) =>
        updateCategory.mutate({ transactionId: transaction.id, categoryId })
      }
    />
  );

  return {
    renderCategory,
    error: updateCategory.isError ? updateCategory.error : null,
    dismissError: () => updateCategory.reset(),
  };
}
