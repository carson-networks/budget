import { Alert } from "@mantine/core";

type MutationErrorBannerProps = {
  message: string;
  onClose: () => void;
};

export function MutationErrorBanner({
  message,
  onClose,
}: MutationErrorBannerProps) {
  return (
    <Alert
      color="red"
      title="Could not update category"
      mb={0}
      onClose={onClose}
      withCloseButton
    >
      {message}
    </Alert>
  );
}
