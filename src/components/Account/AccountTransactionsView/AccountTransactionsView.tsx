import { Alert, Button } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link, useParams } from "react-router-dom";
import { ViewShell } from "../../shared/ViewShell.js";
import { CategoryUpdateErrorAlert } from "../../TransactionsView/CategoryUpdateErrorAlert.js";
import { TransactionsList } from "../../TransactionsView/TransactionsList.js";
import { useTransactionCategoryEditing } from "../../TransactionsView/useTransactionCategoryEditing.js";
import { useAccountTransactionsData } from "./useAccountTransactionsData.js";
import { LoadingState } from "../../shared/LoadingState.js";
import { ErrorAlert } from "../../shared/ErrorAlert.js";

export default function AccountTransactionsView() {
  const { accountId = "" } = useParams<{ accountId: string }>();
  return <AccountTransactionsContent key={accountId} accountId={accountId} />;
}

function AccountTransactionsContent({ accountId }: { accountId: string }) {
  const data = useAccountTransactionsData(accountId);
  const categoryEditing = useTransactionCategoryEditing(data.categories);

  return (
    <ViewShell
      title={
        data.account
          ? `${data.account.name} transactions`
          : "Account transactions"
      }
    >
      <Button
        component={Link}
        to="/accounts"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
        style={{ alignSelf: "flex-start" }}
      >
        Back to accounts
      </Button>
      <CategoryUpdateErrorAlert
        error={categoryEditing.error}
        onDismiss={categoryEditing.dismissError}
      />
      {data.error ? (
        <ErrorAlert error={data.error} />
      ) : data.isLoading ? (
        <LoadingState />
      ) : !data.account ? (
        <Alert color="gray" title="Account not found">
          This account is no longer available.
        </Alert>
      ) : (
        <TransactionsList
          transactions={data.transactions}
          totalCount={data.totalCount}
          hasNextPage={data.hasNextPage}
          isFetchingNextPage={data.isFetchingNextPage}
          loadMoreError={data.loadMoreError}
          onLoadMore={data.loadMore}
          accountNameById={data.accountNameById}
          categoryNameById={data.categoryNameById}
          renderCategory={categoryEditing.renderCategory}
          emptyMessage="No transactions for this account yet."
        />
      )}
    </ViewShell>
  );
}
