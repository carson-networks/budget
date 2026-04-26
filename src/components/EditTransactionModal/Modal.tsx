import { useMemo } from "react";
import {
  Modal,
  Box,
  Stack,
  Button,
  Text,
  Title,
  Alert,
} from "@mantine/core";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import {
  useDeleteTransaction,
  useUpdateTransactionCategory,
  type Transaction,
} from "../../hooks/useTransactions";
import { useAllCategories } from "../../hooks/useCategories";
import { isFakeBudgetData } from "../../data/fakeData";
import { buildTransactionCategorySelectData } from "../TransactionsView/transactionCategorySelectData";
import { useDeleteConfirmation } from "../../hooks/useDeleteConfirmation";
import { DeleteConfirmBar } from "../shared/DeleteConfirmBar";
import { TransactionDetailRows } from "./TransactionDetailRows";
import { TransactionCategoryEditor } from "./TransactionCategoryEditor";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  accountLabel: string;
  opened: boolean;
  onClose: () => void;
}

export default function EditTransactionModal({
  transaction,
  accountLabel,
  opened,
  onClose,
}: EditTransactionModalProps) {
  const deleteTransaction = useDeleteTransaction();
  const updateCategory = useUpdateTransactionCategory();
  const { categories } = useAllCategories();
  const { armed: deleteArmed, arm, disarm, reset: resetDelete } =
    useDeleteConfirmation();

  const handleModalClose = () => {
    resetDelete();
    deleteTransaction.reset();
    updateCategory.reset();
    onClose();
  };

  const categorySelectData = useMemo(
    () => buildTransactionCategorySelectData(categories),
    [categories],
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const canDelete = isFakeBudgetData();
  const txDate = transaction?.transactionDate
    ? timestampDate(transaction.transactionDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const currentCategoryId = transaction?.categoryId;
  const currentCategoryLabel = currentCategoryId
    ? categoryNameById.get(currentCategoryId) ?? currentCategoryId
    : "—";

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Transaction
        </Title>
      }
      centered
      size={440}
    >
      {transaction ? (
        <Box key={transaction.id} style={{ display: "flex", flexDirection: "column" }}>
          <Stack gap="md" mb="md">
            {deleteTransaction.isError && (
              <Alert color="red" title="Error">
                {deleteTransaction.error.message}
              </Alert>
            )}
            {updateCategory.isError && (
              <Alert color="red" title="Error">
                {updateCategory.error.message}
              </Alert>
            )}

            <TransactionDetailRows
              transactionName={transaction.transactionName}
              accountLabel={accountLabel}
              amount={transaction.amount}
              dateLabel={txDate}
            />

            <TransactionCategoryEditor
              categories={categories}
              categorySelectData={categorySelectData}
              currentCategoryId={currentCategoryId}
              currentCategoryLabel={currentCategoryLabel}
              updatePending={updateCategory.isPending}
              onCategoryChange={(categoryId) => {
                updateCategory.mutate({
                  transactionId: transaction.id,
                  categoryId,
                });
              }}
            />

            {!canDelete && (
              <Text size="sm" c="dimmed">
                Deleting transactions requires mock data until the API supports it.
              </Text>
            )}
          </Stack>

          <DeleteConfirmBar
            armed={deleteArmed}
            confirmMessage="Delete this transaction permanently?"
            armButtonLabel="Delete transaction"
            onArm={arm}
            onDisarm={disarm}
            onConfirmDelete={() =>
              deleteTransaction.mutate(transaction.id, {
                onSuccess: () => {
                  resetDelete();
                  handleModalClose();
                },
              })
            }
            canDelete={canDelete}
            deletePending={deleteTransaction.isPending}
            armButtonMb="sm"
            armedStackMb="md"
          />

          <Button fullWidth color="brand" onClick={handleModalClose}>
            Close
          </Button>
        </Box>
      ) : null}
    </Modal>
  );
}
