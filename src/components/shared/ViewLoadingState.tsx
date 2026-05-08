import { Loader, Stack, Text } from "@mantine/core";

export function ViewLoadingState() {
  return (
    <Stack align="center" justify="center" gap="sm" py="xl">
      <Loader size="md" />
      <Text size="sm" c="dimmed">
        Loading…
      </Text>
    </Stack>
  );
}
