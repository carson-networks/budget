import {
  Modal,
  Box,
  Stack,
  Text,
  Alert,
  Title,
} from "@mantine/core";
import { PlaidConnectButton } from "./PlaidConnectButton.js";
import { useConnectedAccountFlow } from "./useConnectedAccountFlow.js";

type CreateConnectedAccountModalProps = {
  open: boolean;
  onClose: () => void;
};

function ConnectedModalInner({ onClose }: { onClose: () => void }) {
  const {
    startLink,
    preparingLink,
    exchanging,
    plaidSessionActive,
    tokenError,
    exchangeError,
    dismissTokenError,
    dismissExchangeError,
  } = useConnectedAccountFlow(onClose);

  const disableConnect =
    preparingLink || exchanging || plaidSessionActive;

  return (
    <Stack gap="md">
      {tokenError ? (
        <Alert
          color="red"
          title="Could not start Plaid"
          onClose={dismissTokenError}
          withCloseButton
        >
          {tokenError}
        </Alert>
      ) : null}

      {exchangeError ? (
        <Alert
          color="red"
          title="Could not link accounts"
          onClose={dismissExchangeError}
          withCloseButton
        >
          {exchangeError}
        </Alert>
      ) : null}

      <Text size="sm" c="dimmed">
        You will sign in with your bank through Plaid&apos;s secure flow.
        Linked accounts and transactions will sync after you finish.
      </Text>

      <Box>
        <PlaidConnectButton
          onPress={startLink}
          loading={preparingLink}
          disabled={disableConnect}
        />
        {exchanging ? (
          <Text size="sm" c="dimmed" mt="sm">
            Saving your bank connection…
          </Text>
        ) : null}
      </Box>
    </Stack>
  );
}

export default function CreateConnectedAccountModal({
  open,
  onClose,
}: CreateConnectedAccountModalProps) {
  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Connect bank account
        </Title>
      }
      centered
      size={520}
    >
      {open ? <ConnectedModalInner onClose={onClose} /> : null}
    </Modal>
  );
}
