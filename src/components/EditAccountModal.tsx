import { useState } from "react";
import {
  Modal,
  Box,
  Stack,
  Button,
  Text,
  Title,
  Group,
  Alert,
} from "@mantine/core";
import { useDeleteAccount, type Account } from "../hooks/useAccounts";
import { isFakeBudgetData } from "../data/fakeData";

interface EditAccountModalProps {
  account: Account | null;
  opened: boolean;
  onClose: () => void;
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(value));
}

export default function EditAccountModal({
  account,
  opened,
  onClose,
}: EditAccountModalProps) {
  const deleteAccount = useDeleteAccount();
  const [deleteArmed, setDeleteArmed] = useState(false);

  const handleModalClose = () => {
    setDeleteArmed(false);
    deleteAccount.reset();
    onClose();
  };

  const canDelete = isFakeBudgetData();

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Account settings
        </Title>
      }
      centered
      size={440}
    >
      {account ? (
        <Box key={account.id} style={{ display: "flex", flexDirection: "column" }}>
          <Stack gap="md" mb="md">
            {deleteAccount.isError && (
              <Alert color="red" title="Error">
                {deleteAccount.error.message}
              </Alert>
            )}

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Name
              </Text>
              <Text size="sm">{account.name}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Sub type
              </Text>
              <Text size="sm">{account.subType}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Balance
              </Text>
              <Text size="sm" fw={500}>
                {formatCurrency(account.balance)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Starting balance
              </Text>
              <Text size="sm">{formatCurrency(account.startingBalance)}</Text>
            </div>
            <Text size="sm" c="dimmed">
              Editing account fields is not available in the API yet. With mock data you
              can delete this account; linked mock transactions are removed too.
            </Text>

            {!canDelete && (
              <Text size="sm" c="dimmed">
                Deleting accounts requires mock data until the API supports it.
              </Text>
            )}
          </Stack>

          {deleteArmed ? (
            <Stack gap="sm" mb="md">
              <Text size="sm" fw={500}>
                Delete this account and all transactions on it (mock data only)?
              </Text>
              <Group grow>
                <Button
                  variant="default"
                  disabled={deleteAccount.isPending}
                  onClick={() => setDeleteArmed(false)}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  loading={deleteAccount.isPending}
                  disabled={!canDelete}
                  onClick={() =>
                    deleteAccount.mutate(account.id, {
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
              Delete account
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
