import {
  Modal,
  Box,
  Stack,
  TextInput,
  Button,
  Alert,
  Loader,
  Title,
} from "@mantine/core";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { categoryMutations, categoryQueries } from "../../../queries/categories.js";
import {
  emptyCategoryForm,
  isCreateCategoryFormValid,
  parentCategoryOptions,
  toCreateCategoryInput,
  type CategoryFormValues,
} from "../categoryForm.js";
import { CategoryTypeSelect } from "./CategoryTypeSelect.js";
import { ParentCategoryField } from "./ParentCategoryField.js";

type CreateCategoryModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateCategoryModal({
  open,
  onClose,
}: CreateCategoryModalProps) {
  const [values, setValues] = useState(emptyCategoryForm);
  const { data: categories = [] } = useInfiniteQuery(categoryQueries.list());
  const createCategory = useMutation(categoryMutations.create);
  const parentOptions = useMemo(
    () => parentCategoryOptions(categories),
    [categories],
  );
  const isFormValid = isCreateCategoryFormValid(values);

  const setField = <K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setValues(emptyCategoryForm());
    createCategory.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    createCategory.mutate(toCreateCategoryInput(values), {
      onSuccess: handleClose,
    });
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          New Category
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
          {createCategory.isError && (
            <Alert color="red" title="Error">
              {createCategory.error.message}
            </Alert>
          )}

          <TextInput
            label="Name"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            required
            autoFocus
          />

          <CategoryTypeSelect
            label="Category Type"
            value={values.categoryType}
            onChange={(value) => setField("categoryType", value)}
            comboboxProps={{ withinPortal: true }}
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
          disabled={!isFormValid || createCategory.isPending}
          leftSection={createCategory.isPending ? <Loader size="sm" /> : null}
        >
          {createCategory.isPending ? "Creating..." : "Create Category"}
        </Button>
      </Box>
    </Modal>
  );
}
