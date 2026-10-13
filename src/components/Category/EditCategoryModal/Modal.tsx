import {
  Modal,
  Box,
  Stack,
  TextInput,
  Button,
  Alert,
  Loader,
  Title,
  Checkbox,
} from "@mantine/core";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import type { Category } from "../../../models";
import { categoryMutations, categoryQueries } from "../../../queries/categories.js";
import {
  categoryFormFrom,
  isEditCategoryFormValid,
  parentCategoryOptions,
  toUpdateCategoryInput,
  type CategoryFormValues,
} from "../categoryForm.js";
import { ParentCategoryField } from "../CreateCategoryModal/ParentCategoryField.js";

type EditCategoryModalProps = {
  category: Category | null;
  open: boolean;
  onClose: () => void;
};

type CategorySettingsBodyProps = {
  category: Category;
  onClose: () => void;
};

/** Form state for one category. Remounted via `key={category.id}`. */
function CategorySettingsBody({
  category,
  onClose,
}: CategorySettingsBodyProps) {
  const [values, setValues] = useState(() => categoryFormFrom(category));
  const { data: categories = [] } = useInfiniteQuery(categoryQueries.list());
  const updateCategory = useMutation(categoryMutations.update);
  const parentOptions = useMemo(
    () => parentCategoryOptions(categories, category.id),
    [categories, category.id],
  );
  const isFormValid = isEditCategoryFormValid(values);
  const busy = updateCategory.isPending;

  const setField = <K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    updateCategory.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    updateCategory.mutate(toUpdateCategoryInput(category.id, values), {
      onSuccess: handleClose,
    });
  };

  return (
    <Modal
      opened
      onClose={handleClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          Category settings
        </Title>
      }
      centered
      size={440}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Stack gap="md" mb="md">
          {updateCategory.isError ? (
            <Alert color="red" title="Error">
              {updateCategory.error.message}
            </Alert>
          ) : null}

          <TextInput
            label="Name"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            required
            autoFocus
          />

          <Checkbox
            label="Disabled"
            checked={values.isDisabled}
            onChange={(e) => setField("isDisabled", e.currentTarget.checked)}
          />

          <ParentCategoryField
            parentOptions={parentOptions}
            parentCategoryId={values.parentCategoryId}
            onParentChange={(value) => setField("parentCategoryId", value)}
          />
        </Stack>

        <Button
          type="submit"
          fullWidth
          color="brand"
          disabled={!isFormValid || busy}
          leftSection={updateCategory.isPending ? <Loader size="sm" /> : null}
        >
          {updateCategory.isPending ? "Saving..." : "Save changes"}
        </Button>
      </Box>
    </Modal>
  );
}

export default function EditCategoryModal({
  category,
  open,
  onClose,
}: EditCategoryModalProps) {
  if (!open || !category) {
    return null;
  }

  return (
    <CategorySettingsBody
      key={category.id}
      category={category}
      onClose={onClose}
    />
  );
}
