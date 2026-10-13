import { useReferenceData } from "../../hooks/useReferenceData.js";
import { useTransactions } from "../../hooks/useTransactions.js";
import { ViewShell } from "../shared/ViewShell.js";
import { TransactionsList } from "./TransactionsList.js";
import { CategoryUpdateErrorAlert } from "./CategoryUpdateErrorAlert.js";
import { useTransactionCategoryEditing } from "./useTransactionCategoryEditing.js";
import { LoadingState } from "../shared/LoadingState.js";
import { ErrorAlert } from "../shared/ErrorAlert.js";

export default function TransactionsView() {
  const {
    transactions,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    loadMoreError,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useTransactions();
  const {
    categories,
    accountNameById,
    categoryNameById,
    isLoading: referenceLoading,
    error: referenceError,
  } = useReferenceData();

  const categoryEditing = useTransactionCategoryEditing(categories);

  const isLoading = transactionsLoading || referenceLoading;
  const error = transactionsError ?? referenceError;

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorAlert error={error} />;
  }

  return (
    <ViewShell title="Transactions">
      <CategoryUpdateErrorAlert
        error={categoryEditing.error}
        onDismiss={categoryEditing.dismissError}
      />
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
      />
    </ViewShell>
  );
}
