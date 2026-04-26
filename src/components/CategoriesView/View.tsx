import { useMemo } from "react";
import { Box } from "@mantine/core";
import { useAllCategories, type Category } from "../../hooks/useCategories";
import { useEntityModals } from "../../hooks/useEntityModals";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../../utils/categorySegments";
import CreateCategoryModal from "../CreateCategoryModal/Modal";
import EditCategoryModal from "../EditCategoryModal/Modal";
import { SegmentHeader } from "./SegmentHeader";
import { EmptySubcategoriesMessage } from "./EmptySubcategoriesMessage";
import { SubcategoriesTable } from "./SubcategoriesTable";
import { FloatingCreateButton } from "../shared/FloatingCreateButton";
import { SectionCard } from "../shared/SectionCard";
import { ViewErrorAlert } from "../shared/ViewErrorAlert";
import { ViewLoadingState } from "../shared/ViewLoadingState";
import { ViewShell } from "../shared/ViewShell";

export default function CategoriesView() {
  const { categories, isLoading, error } = useAllCategories();
  const {
    createOpen,
    closeCreate,
    openCreate,
    editing: settingsCategory,
    setEditing: setSettingsCategory,
  } = useEntityModals<Category>();

  const segments = useMemo(
    () => sortCategorySegmentsForDisplay(buildCategorySegments(categories)),
    [categories],
  );

  if (isLoading) {
    return <ViewLoadingState />;
  }

  if (error) {
    return <ViewErrorAlert message={error.message} />;
  }

  return (
    <ViewShell title="Categories">
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
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
            {segment.descendantRows.length === 0 ? (
              <EmptySubcategoriesMessage />
            ) : (
              <SubcategoriesTable
                rows={segment.descendantRows}
                onRowSettings={setSettingsCategory}
              />
            )}
          </SectionCard>
        ))}
      </Box>

      <FloatingCreateButton ariaLabel="add category" onClick={openCreate} />

      <CreateCategoryModal open={createOpen} onClose={closeCreate} />

      <EditCategoryModal
        category={settingsCategory}
        opened={settingsCategory !== null}
        onClose={() => setSettingsCategory(null)}
      />
    </ViewShell>
  );
}
