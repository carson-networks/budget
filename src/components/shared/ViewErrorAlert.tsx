import { Alert, Box } from "@mantine/core";

type ViewErrorAlertProps = {
  message: string;
};

export function ViewErrorAlert({ message }: ViewErrorAlertProps) {
  return (
    <Box style={{ flex: 1, padding: 16 }}>
      <Alert color="red" title="Error">
        {message}
      </Alert>
    </Box>
  );
}
