import { useMemo, useState, useEffect } from "react";
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
  Title,
} from "@mantine/core";
import {
  useAllCategories,
  useCreateCategory,
  CategoryType,
  type CreateCategoryInput,
} from "../hooks/useCategories";

interface CreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_TYPES = [
  { value: String(CategoryType.INCOME), label: "Income" },
  { value: String(CategoryType.EXPENSE), label: "Expense" },
];

export default function CreateCategoryModal({
  open,
  onClose,
}: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState<string | null>(
    String(CategoryType.EXPENSE),
  );
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const { categories } = useAllCategories();
  const createCategory = useCreateCategory();

  useEffect(() => {
    if (!open) createCategory.reset();
  }, [open, createCategory]);

  const parentOptions = useMemo(
    () =>
      [...categories]
        .filter((c) => !c.parentCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const resetForm = () => {
    setName("");
    setCategoryType(String(CategoryType.EXPENSE));
    setParentCategoryId(null);
    setIsGroup(false);
    setIsDisabled(false);
    createCategory.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryType === null) return;

    const hasParent = parentCategoryId !== null && parentCategoryId !== "";
    const body: CreateCategoryInput = {
      name,
      isParent: !hasParent && isGroup,
      parentCategoryId: hasParent ? parentCategoryId! : undefined,
      isDisabled,
      categoryType: Number(categoryType) as CategoryType,
    };

    createCategory.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isFormValid = name.trim().length > 0 && categoryType !== null;

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
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Category Type"
            value={categoryType}
            onChange={setCategoryType}
            data={CATEGORY_TYPES}
            required
          />

          <Checkbox
            label="Disabled"
            checked={isDisabled}
            onChange={(e) => setIsDisabled(e.currentTarget.checked)}
          />

          <Select
            label="Parent category"
            placeholder="None (top level)"
            description="Subcategories can only sit under a top-level category."
            clearable
            data={parentOptions}
            value={parentCategoryId}
            onChange={setParentCategoryId}
          />

          <Checkbox
            label="Group category (can contain subcategories)"
            checked={isGroup}
            disabled={!!parentCategoryId}
            onChange={(e) => setIsGroup(e.currentTarget.checked)}
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
