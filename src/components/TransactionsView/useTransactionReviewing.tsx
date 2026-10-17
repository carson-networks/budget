import { ActionIcon } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import type { Transaction } from "../../models";
import { transactionMutations } from "../../queries/transactions.js";

export function useTransactionReviewing() {
  const markReviewed = useMutation(transactionMutations.markReviewed);

  const renderReviewControl = (transaction: Transaction) => (
    <ActionIcon
      variant="subtle"
      color="green"
      aria-label={`Mark ${transaction.transactionName} as reviewed`}
      onClick={() => markReviewed.mutate(transaction.id)}
    >
      <IconCheck size={18} />
    </ActionIcon>
  );

  return {
    renderReviewControl,
    error: markReviewed.isError ? markReviewed.error : null,
    dismissError: () => markReviewed.reset(),
  };
}
