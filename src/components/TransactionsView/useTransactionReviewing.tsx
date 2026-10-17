import { Checkbox } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import type { Transaction } from "../../models";
import { transactionMutations } from "../../queries/transactions.js";

export function useTransactionReviewing() {
  const markReviewed = useMutation(transactionMutations.markReviewed);

  const renderReviewControl = (transaction: Transaction) =>
    transaction.needsReview ? (
      <Checkbox
        checked={false}
        aria-label={`Mark ${transaction.transactionName} as reviewed`}
        onChange={() => markReviewed.mutate(transaction.id)}
      />
    ) : (
      <IconCheck
        size={20}
        color="var(--mantine-color-green-6)"
        role="img"
        aria-label={`${transaction.transactionName} reviewed`}
      />
    );

  return {
    renderReviewControl,
    error: markReviewed.isError ? markReviewed.error : null,
    dismissError: () => markReviewed.reset(),
  };
}
