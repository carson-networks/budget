import { Alert } from "@mantine/core";

type ErrorAlertProps = {
  error: Error;
  title?: string;
};

export function ErrorAlert({
  error,
  title = "Something went wrong",
}: ErrorAlertProps) {
  return (
    <Alert color="red" title={title}>
      {error.message}
    </Alert>
  );
}
