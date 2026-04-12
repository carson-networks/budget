import { useState, useEffect, useCallback } from "react";
import { Stack, Button, Alert, Text } from "@mantine/core";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { plaidClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import { isFakeBudgetData } from "../data/fakeData";

const FAKE_PLAID_METADATA: PlaidLinkOnSuccessMetadata = {
  institution: { name: "Demo Bank", institution_id: "ins_demo" },
  accounts: [
    {
      id: "plaid-demo-acc",
      name: "Checking",
      mask: "1111",
      type: "depository",
      subtype: "checking",
      verification_status: "",
    },
  ],
  link_session_id: "demo-session",
};

export type PlaidConnectButtonProps = {
  disabled?: boolean;
  /** When false, internal link token state is cleared (e.g. user switched integration). */
  active: boolean;
  /** Fires after Link succeeds or after the fake-data shortcut. */
  onLinked: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => void;
  linked: boolean;
};

export function PlaidConnectButton({
  disabled,
  active,
  onLinked,
  linked,
}: PlaidConnectButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      onLinked(publicToken, metadata);
      setLinkToken(null);
    },
    [onLinked],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => setLinkToken(null),
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  useEffect(() => {
    if (!active) {
      setLinkToken(null);
      setError(null);
      setLoadingToken(false);
    }
  }, [active]);

  const handleConnect = async () => {
    setError(null);
    if (linked) return;

    if (isFakeBudgetData()) {
      onLinked("public-token-fake-demo", FAKE_PLAID_METADATA);
      return;
    }

    setLoadingToken(true);
    try {
      const res = await plaidClient.createLinkToken({});
      setLinkToken(res.linkToken);
    } catch (e) {
      setError(connectErrorMessage(e));
    } finally {
      setLoadingToken(false);
    }
  };

  return (
    <Stack gap="sm">
      {error ? (
        <Alert color="red" title="Could not start Plaid" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="light"
        color="brand"
        onClick={() => void handleConnect()}
        loading={loadingToken}
        disabled={disabled || linked || !active}
      >
        Connect with Plaid
      </Button>

      {linked ? (
        <Text size="sm" c="teal">
          Plaid connection completed. You can create this account.
        </Text>
      ) : null}
    </Stack>
  );
}
