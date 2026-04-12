import { useMemo, useState } from "react";
import {
  Modal,
  Box,
  Stack,
  Button,
  Text,
  Title,
  Group,
  Alert,
  Select,
} from "@mantine/core";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import {
  useDeleteTransaction,
  useUpdateTransactionCategory,
  type Transaction,
} from "../hooks/useTransactions";
import { useAllCategories } from "../hooks/useCategories";
import { isFakeBudgetData } from "../data/fakeData";
import {
  buildTransactionCategorySelectData,
  countSelectableTransactionCategories,
  isSelectableTransactionCategory,
} from "../utils/transactionCategorySelectData";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  accountLabel: string;
  opened: boolean;
  onClose: () => void;
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(value));
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
  const [deleteArmed, setDeleteArmed] = useState(false);

  const handleModalClose = () => {
    setDeleteArmed(false);
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
  const currentIsSelectable = isSelectableTransactionCategory(
    categories,
    currentCategoryId,
  );

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

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Name
              </Text>
              <Text size="sm">{transaction.transactionName}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Account
              </Text>
              <Text size="sm">{accountLabel}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Category
              </Text>
              <Select
                mt={4}
                placeholder="Pick category"
                data={categorySelectData}
                value={currentIsSelectable ? currentCategoryId! : null}
                onChange={(id) => {
                  if (!id || id === currentCategoryId) return;
                  updateCategory.mutate({
                    transactionId: transaction.id,
                    categoryId: id,
                  });
                }}
                disabled={
                  updateCategory.isPending ||
                  countSelectableTransactionCategories(categories) === 0
                }
                searchable
                nothingFoundMessage="No categories"
              />
              {currentCategoryId && !currentIsSelectable && (
                <Text size="xs" c="orange" mt={6}>
                  Current assignment ({currentCategoryLabel}) is a parent or unavailable; choose a
                  subcategory.
                </Text>
              )}
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Amount
              </Text>
              <Text size="sm" fw={500}>
                {formatCurrency(transaction.amount)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Date
              </Text>
              <Text size="sm">{txDate}</Text>
            </div>

            {!canDelete && (
              <Text size="sm" c="dimmed">
                Deleting transactions requires mock data until the API supports it.
              </Text>
            )}
          </Stack>

          {deleteArmed ? (
            <Stack gap="sm" mb="md">
              <Text size="sm" fw={500}>
                Delete this transaction permanently?
              </Text>
              <Group grow>
                <Button variant="default" onClick={() => setDeleteArmed(false)}>
                  Cancel
                </Button>
                <Button
                  color="red"
                  loading={deleteTransaction.isPending}
                  onClick={() =>
                    deleteTransaction.mutate(transaction.id, {
                      onSuccess: () => {
                        handleModalClose();
                      },
                    })
                  }
                >
                  Delete
                </Button>
              </Group>
            </Stack>
          ) : (
            <Button
              variant="light"
              color="red"
              fullWidth
              mb="sm"
              disabled={!canDelete}
              onClick={() => setDeleteArmed(true)}
            >
              Delete transaction
            </Button>
          )}

          <Button fullWidth color="brand" onClick={handleModalClose}>
            Close
          </Button>
        </Box>
      ) : null}
    </Modal>
  );
}
