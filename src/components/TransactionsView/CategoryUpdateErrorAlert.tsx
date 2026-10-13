import { Alert } from "@mantine/core";

type CategoryUpdateErrorAlertProps = {
  error: Error | null;
  onDismiss: () => void;
};

export function CategoryUpdateErrorAlert({
  error,
  onDismiss,
}: CategoryUpdateErrorAlertProps) {
  if (!error) return null;
  return (
    <Alert
      color="red"
      title="Could not update category"
      withCloseButton
      closeButtonLabel="Dismiss category update error"
      onClose={onDismiss}
    >
      {error.message}
    </Alert>
  );
}
