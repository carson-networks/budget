import { useMemo } from "react";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { useAllCategories } from "../../../hooks/useCategories.js";
import { SectionCard } from "../../shared/SectionCard.js";
import { ViewShell } from "../../shared/ViewShell.js";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "./categorySegments.js";
import { EmptySubcategoriesMessage } from "./EmptySubcategoriesMessage.js";
import { SegmentHeader } from "./SegmentHeader.js";
import { SubcategoriesTable } from "./SubcategoriesTable.js";

export default function CategoriesView() {
  const { categories, isLoading, error } = useAllCategories();

  const segments = useMemo(
    () => sortCategorySegmentsForDisplay(buildCategorySegments(categories)),
    [categories],
  );

  if (isLoading) {
    return (
      <Stack align="center" justify="center" gap="sm" py="xl">
        <Loader size="md" />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Something went wrong">
        {error.message}
      </Alert>
    );
  }

  return (
    <ViewShell title="Categories">
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
        {categories.length === 0 ? (
          <Text size="sm" c="dimmed">
            No categories yet.
          </Text>
        ) : null}
        {segments.map((segment) => (
          <SectionCard
            key={segment.root.id}
            header={<SegmentHeader root={segment.root} />}
          >
            {segment.descendantRows.length === 0 ? (
              <EmptySubcategoriesMessage />
            ) : (
              <SubcategoriesTable rows={segment.descendantRows} />
            )}
          </SectionCard>
        ))}
      </Box>
    </ViewShell>
  );
}
