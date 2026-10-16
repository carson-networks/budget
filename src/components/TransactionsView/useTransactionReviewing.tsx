import { Checkbox } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import type { Transaction } from "../../models";
import { transactionMutations } from "../../queries/transactions.js";

export function useTransactionReviewing() {
  const markReviewed = useMutation(transactionMutations.markReviewed);

  const renderReviewCheckbox = (transaction: Transaction) => (
    <Checkbox
      checked={false}
      aria-label={`Mark ${transaction.transactionName} as reviewed`}
      onChange={() => markReviewed.mutate(transaction.id)}
    />
  );

  return {
    renderReviewCheckbox,
    error: markReviewed.isError ? markReviewed.error : null,
    dismissError: () => markReviewed.reset(),
  };
}
