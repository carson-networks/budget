import { Button } from "@mantine/core";

type PlaidConnectButtonProps = {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
};

export function PlaidConnectButton({
  onPress,
  loading,
  disabled,
}: PlaidConnectButtonProps) {
  return (
    <Button
      type="button"
      variant="light"
      color="brand"
      loading={loading}
      disabled={disabled}
      onClick={() => void onPress()}
    >
      Connect with Plaid
    </Button>
  );
}
