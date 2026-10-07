import { useMemo, useState } from "react";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { useAllCategories } from "../../../hooks/useCategories.js";
import type { Category } from "../../../models";
import { SectionCard } from "../../shared/SectionCard.js";
import { FloatingCreateButton } from "../../shared/FloatingCreateButton.js";
import { ViewShell } from "../../shared/ViewShell.js";
import CreateCategoryModal from "../CreateCategoryModal/Modal.js";
import EditCategoryModal from "../EditCategoryModal/Modal.js";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "./categorySegments.js";
import { EmptySubcategoriesMessage } from "./EmptySubcategoriesMessage.js";
import { SegmentHeader } from "./SegmentHeader.js";
import { SubcategoriesTable } from "./SubcategoriesTable.js";

export default function CategoriesView() {
  const { categories, isLoading, error } = useAllCategories();
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<Category | null>(
    null,
  );

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
            header={
              <SegmentHeader
                root={segment.root}
                onRootSettings={() => setSettingsCategory(segment.root)}
              />
            }
          >
            {segment.children.length === 0 ? (
              <EmptySubcategoriesMessage />
            ) : (
              <SubcategoriesTable
                categories={segment.children}
                onRowSettings={setSettingsCategory}
              />
            )}
          </SectionCard>
        ))}
      </Box>

      <FloatingCreateButton
        ariaLabel="add category"
        onClick={() => setCreateOpen(true)}
      />

      <CreateCategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <EditCategoryModal
        category={settingsCategory}
        open={settingsCategory !== null}
        onClose={() => setSettingsCategory(null)}
      />
    </ViewShell>
  );
}
