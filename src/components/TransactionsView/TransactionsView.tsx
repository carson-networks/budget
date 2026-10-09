import { useReferenceData } from "../../hooks/useReferenceData.js";
import { useTransactionsPager } from "../../hooks/useTransactionsPager.js";
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
    page,
    setPage,
    pageSize,
    isLoading: transactionsLoading,
    isPlaceholderData,
    error: transactionsError,
  } = useTransactionsPager();
  const {
    categories,
    accountNameById,
    categoryNameById,
    isLoading: referenceLoading,
    error: referenceError,
  } = useReferenceData();

  const categoryEditing = useTransactionCategoryEditing(categories, {
    disabled: isPlaceholderData,
  });

  const isLoading =
    (transactionsLoading && !isPlaceholderData) || referenceLoading;
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
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        accountNameById={accountNameById}
        categoryNameById={categoryNameById}
        renderCategory={categoryEditing.renderCategory}
      />
    </ViewShell>
  );
}
