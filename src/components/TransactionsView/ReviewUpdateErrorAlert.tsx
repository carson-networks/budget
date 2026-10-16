import { Alert } from "@mantine/core";

type ReviewUpdateErrorAlertProps = {
  error: Error | null;
  onDismiss: () => void;
};

export function ReviewUpdateErrorAlert({
  error,
  onDismiss,
}: ReviewUpdateErrorAlertProps) {
  if (!error) return null;
  return (
    <Alert
      color="red"
      title="Could not mark as reviewed"
      withCloseButton
      closeButtonLabel="Dismiss review error"
      onClose={onDismiss}
    >
      {error.message}
    </Alert>
  );
}
