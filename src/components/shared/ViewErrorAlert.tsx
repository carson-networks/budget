import { Alert } from "@mantine/core";

type ViewErrorAlertProps = {
  message: string;
};

export function ViewErrorAlert({ message }: ViewErrorAlertProps) {
  return (
    <Alert color="red" title="Something went wrong">
      {message}
    </Alert>
  );
}
