import { Group } from "@mantine/core";
import { useReferenceData } from "../../hooks/useReferenceData.js";
import { useTransactions } from "../../hooks/useTransactions.js";
import { ViewShell } from "../shared/ViewShell.js";
import { TransactionsList } from "./TransactionsList.js";
import { CategoryUpdateErrorAlert } from "./CategoryUpdateErrorAlert.js";
import { NeedsReviewToggle } from "./NeedsReviewToggle.js";
import { useNeedsReviewOnly } from "./useNeedsReviewOnly.js";
import { useTransactionCategoryEditing } from "./useTransactionCategoryEditing.js";
import { LoadingState } from "../shared/LoadingState.js";
import { ErrorAlert } from "../shared/ErrorAlert.js";

export default function TransactionsView() {
  const [needsReviewOnly, setNeedsReviewOnly] = useNeedsReviewOnly();
  const {
    transactions,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    loadMoreError,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useTransactions({ needsReview: needsReviewOnly || undefined });
  const {
    categories,
    accountNameById,
    categoryNameById,
    isLoading: referenceLoading,
    error: referenceError,
  } = useReferenceData();

  const categoryEditing = useTransactionCategoryEditing(categories);

  if (referenceLoading) {
    return <LoadingState />;
  }

  if (referenceError) {
    return <ErrorAlert error={referenceError} />;
  }

  return (
    <ViewShell title="Transactions">
      <Group mb="sm">
        <NeedsReviewToggle
          active={needsReviewOnly}
          onToggle={setNeedsReviewOnly}
        />
      </Group>
      <CategoryUpdateErrorAlert
        error={categoryEditing.error}
        onDismiss={categoryEditing.dismissError}
      />
      {transactionsError ? (
        <ErrorAlert error={transactionsError} />
      ) : transactionsLoading ? (
        <LoadingState />
      ) : (
        <TransactionsList
          transactions={transactions}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loadMoreError={loadMoreError}
          onLoadMore={loadMore}
          accountNameById={accountNameById}
          categoryNameById={categoryNameById}
          renderCategory={categoryEditing.renderCategory}
          emptyMessage={
            needsReviewOnly ? "No transactions need review." : undefined
          }
        />
      )}
    </ViewShell>
  );
}
