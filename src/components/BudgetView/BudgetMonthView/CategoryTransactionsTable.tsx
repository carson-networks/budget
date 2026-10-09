import {
  TransactionsList,
  type TransactionsListProps,
} from "../../TransactionsView/TransactionsList.js";
import { CategoryUpdateErrorAlert } from "../../TransactionsView/CategoryUpdateErrorAlert.js";
import { LoadingState } from "../../shared/LoadingState.js";
import { ErrorAlert } from "../../shared/ErrorAlert.js";

type CategoryTransactionsTableProps = Omit<
  TransactionsListProps,
  "emptyMessage"
> & {
  categoryName: string;
  isLoading: boolean;
  error: Error | null;
  categoryUpdateError: Error | null;
  onDismissCategoryUpdateError: () => void;
};

export function CategoryTransactionsTable({
  categoryName,
  isLoading,
  error,
  categoryUpdateError,
  onDismissCategoryUpdateError,
  ...listProps
}: CategoryTransactionsTableProps) {
  return (
    <>
      <CategoryUpdateErrorAlert
        error={categoryUpdateError}
        onDismiss={onDismissCategoryUpdateError}
      />
      {error ? (
        <ErrorAlert error={error} title="Could not load transactions" />
      ) : isLoading ? (
        <LoadingState size="sm" py="lg" />
      ) : (
        <TransactionsList
          {...listProps}
          emptyMessage={`No ${categoryName} transactions this month.`}
        />
      )}
    </>
  );
}
