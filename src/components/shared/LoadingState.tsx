import {
  Loader,
  Stack,
  Text,
  type MantineSize,
  type StackProps,
} from "@mantine/core";

type LoadingStateProps = Pick<StackProps, "py"> & {
  size?: MantineSize;
};

export function LoadingState({ size = "md", py = "xl" }: LoadingStateProps) {
  return (
    <Stack align="center" justify="center" gap="sm" py={py}>
      <Loader size={size} />
      <Text size="sm" c="dimmed">
        Loading…
      </Text>
    </Stack>
  );
}
