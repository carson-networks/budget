import { useState } from "react";
import {
  Box,
  Stack,
  TextInput,
  Button,
  Alert,
  Loader,
  Checkbox,
  Text,
} from "@mantine/core";
import {
  useUpdateCategory,
  useDeleteCategory,
  CategoryType,
  type Category,
} from "../../hooks/useCategories";
import { isFakeBudgetData } from "../../data/fakeData";
import { useDeleteConfirmation } from "../../hooks/useDeleteConfirmation";
import { DeleteConfirmBar } from "../shared/DeleteConfirmBar";
import { categoryTypeToSelectValue } from "../../constants/categoryTypes";
import { CategoryTypeSelect } from "../shared/CategoryTypeSelect";

type CategorySettingsFormProps = {
  category: Category;
  updateCategory: ReturnType<typeof useUpdateCategory>;
  deleteCategory: ReturnType<typeof useDeleteCategory>;
  onDismiss: () => void;
};

export function CategorySettingsForm({
  category,
  updateCategory,
  deleteCategory,
  onDismiss,
}: CategorySettingsFormProps) {
  const [name, setName] = useState(category.name);
  const [categoryType, setCategoryType] = useState<string | null>(
    categoryTypeToSelectValue(category.categoryType),
  );
  const [isDisabled, setIsDisabled] = useState(category.isDisabled);
  const { armed: deleteArmed, arm, disarm, reset: resetDelete } =
    useDeleteConfirmation();

  const isParentCategory = !category.parentCategoryId;
  const canEditType = isParentCategory && isFakeBudgetData();
  const canDelete = isFakeBudgetData();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canEditType && categoryType === null) return;

    const typeForSave =
      canEditType && categoryType !== null
        ? (Number(categoryType) as CategoryType)
        : category.categoryType;

    updateCategory.mutate(
      {
        id: category.id,
        name: name.trim(),
        isDisabled,
        categoryType: typeForSave,
      },
      {
        onSuccess: () => {
          onDismiss();
        },
      },
    );
  };

  const isFormValid =
    name.trim().length > 0 && (!canEditType || categoryType !== null);

  const deleteBusy =
    deleteCategory.isPending || updateCategory.isPending;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Stack gap="md" mb="md">
        {(updateCategory.isError || deleteCategory.isError) && (
          <Alert color="red" title="Error">
            {(updateCategory.error ?? deleteCategory.error)?.message}
          </Alert>
        )}

        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Checkbox
          label="Disabled"
          checked={isDisabled}
          onChange={(e) => setIsDisabled(e.currentTarget.checked)}
        />

        {canEditType ? (
          <CategoryTypeSelect
            label="Category type"
            value={categoryType}
            onChange={setCategoryType}
          />
        ) : !isParentCategory ? (
          <Text size="sm" c="dimmed">
            Category type is set on the parent group and can’t be changed for a
            subcategory.
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            Category type can’t be changed while connected to the server (update API is
            limited). Use mock data to try type changes on a parent category.
          </Text>
        )}

        {!canDelete && (
          <Text size="sm" c="dimmed">
            Deleting categories requires mock data until the API supports it.
          </Text>
        )}
      </Stack>

      <Button
        type="submit"
        fullWidth
        color="brand"
        mb="sm"
        disabled={!isFormValid || updateCategory.isPending || deleteCategory.isPending}
        leftSection={updateCategory.isPending ? <Loader size="sm" /> : null}
      >
        {updateCategory.isPending ? "Saving..." : "Save changes"}
      </Button>

      <DeleteConfirmBar
        armed={deleteArmed}
        confirmMessage={
          isParentCategory
            ? "Delete this category and all of its subcategories?"
            : "Delete this subcategory?"
        }
        armButtonLabel="Delete category"
        onArm={arm}
        onDisarm={disarm}
        onConfirmDelete={() =>
          deleteCategory.mutate(category.id, {
            onSuccess: () => {
              resetDelete();
              onDismiss();
            },
          })
        }
        canDelete={canDelete}
        deletePending={deleteCategory.isPending}
        cancelDisabled={deleteBusy}
        armDisabled={deleteBusy}
        armButtonMb="md"
        armedStackMb="md"
      />
    </Box>
  );
}
