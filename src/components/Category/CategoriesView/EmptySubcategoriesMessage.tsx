import { Box, Text } from "@mantine/core";

export function EmptySubcategoriesMessage() {
  return (
    <Box px="md" py="md">
      <Text size="sm" c="dimmed">
        No subcategories
      </Text>
    </Box>
  );
}
