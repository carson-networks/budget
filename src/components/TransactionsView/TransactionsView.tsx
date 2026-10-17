import { useReferenceData } from "../../hooks/useReferenceData.js";
import { useTransactions } from "../../hooks/useTransactions.js";
import { ViewShell } from "../shared/ViewShell.js";
import { TransactionsList } from "./TransactionsList.js";
import { CategoryUpdateErrorAlert } from "./CategoryUpdateErrorAlert.js";
import { NeedsReviewToggle } from "./NeedsReviewToggle.js";
import { ReviewUpdateErrorAlert } from "./ReviewUpdateErrorAlert.js";
import { TransactionsPanel } from "./TransactionsPanel.js";
import { useNeedsReviewOnly } from "./useNeedsReviewOnly.js";
import { useTransactionCategoryEditing } from "./useTransactionCategoryEditing.js";
import { useTransactionReviewing } from "./useTransactionReviewing.js";
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
  const reviewing = useTransactionReviewing();

  if (referenceLoading) {
    return <LoadingState />;
  }

  if (referenceError) {
    return <ErrorAlert error={referenceError} />;
  }

  const header = (
    <NeedsReviewToggle active={needsReviewOnly} onToggle={setNeedsReviewOnly} />
  );

  return (
    <ViewShell title="Transactions">
      <CategoryUpdateErrorAlert
        error={categoryEditing.error}
        onDismiss={categoryEditing.dismissError}
      />
      <ReviewUpdateErrorAlert
        error={reviewing.error}
        onDismiss={reviewing.dismissError}
      />
      {transactionsError ? (
        <TransactionsPanel header={header}>
          <ErrorAlert error={transactionsError} />
        </TransactionsPanel>
      ) : transactionsLoading ? (
        <TransactionsPanel header={header}>
          <LoadingState />
        </TransactionsPanel>
      ) : (
        <TransactionsList
          header={header}
          transactions={transactions}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loadMoreError={loadMoreError}
          onLoadMore={loadMore}
          accountNameById={accountNameById}
          categoryNameById={categoryNameById}
          renderCategory={categoryEditing.renderCategory}
          renderLeading={
            needsReviewOnly ? reviewing.renderReviewControl : undefined
          }
          emptyMessage={
            needsReviewOnly ? "No transactions need review." : undefined
          }
        />
      )}
    </ViewShell>
  );
}
