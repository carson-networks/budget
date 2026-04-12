import { useState } from "react";
import {
  Modal,
  Box,
  Stack,
  TextInput,
  Select,
  Button,
  Alert,
  Loader,
  Checkbox,
  Text,
  Title,
  Group,
} from "@mantine/core";
import {
  useUpdateCategory,
  useDeleteCategory,
  CategoryType,
  type Category,
} from "../hooks/useCategories";
import { isFakeBudgetData } from "../data/fakeData";

interface EditCategoryModalProps {
  category: Category | null;
  opened: boolean;
  onClose: () => void;
}

const CATEGORY_TYPES = [
  { value: String(CategoryType.INCOME), label: "Income" },
  { value: String(CategoryType.EXPENSE), label: "Expense" },
];

function categoryTypeToSelectValue(t: CategoryType): string {
  return t === CategoryType.INCOME
    ? String(CategoryType.INCOME)
    : String(CategoryType.EXPENSE);
}

function CategorySettingsForm({
  category,
  updateCategory,
  deleteCategory,
  onDismiss,
}: {
  category: Category;
  updateCategory: ReturnType<typeof useUpdateCategory>;
  deleteCategory: ReturnType<typeof useDeleteCategory>;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [categoryType, setCategoryType] = useState<string | null>(
    categoryTypeToSelectValue(category.categoryType),
  );
  const [isDisabled, setIsDisabled] = useState(category.isDisabled);
  const [deleteArmed, setDeleteArmed] = useState(false);

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
          <Select
            label="Category type"
            value={categoryType}
            onChange={setCategoryType}
            data={CATEGORY_TYPES}
            required
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

      {deleteArmed ? (
        <Stack gap="sm" mb="md">
          <Text size="sm" fw={500}>
            {isParentCategory
              ? "Delete this category and all of its subcategories?"
              : "Delete this subcategory?"}
          </Text>
          <Group grow>
            <Button
              variant="default"
              disabled={deleteBusy}
              onClick={() => setDeleteArmed(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteCategory.isPending}
              disabled={!canDelete}
              onClick={() =>
                deleteCategory.mutate(category.id, {
                  onSuccess: () => {
                    onDismiss();
                  },
                })
              }
            >
              Delete
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button
          variant="light"
          color="red"
          fullWidth
          mb="md"
          disabled={!canDelete || deleteBusy}
          onClick={() => setDeleteArmed(true)}
        >
          Delete category
        </Button>
      )}
    </Box>
  );
}

export default function EditCategoryModal({
  category,
  opened,
  onClose,
}: EditCategoryModalProps) {
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const handleModalClose = () => {
    updateCategory.reset();
    deleteCategory.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Category settings
        </Title>
      }
      centered
      size={440}
    >
      {category ? (
        <CategorySettingsForm
          key={category.id}
          category={category}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          onDismiss={handleModalClose}
        />
      ) : null}
    </Modal>
  );
}
