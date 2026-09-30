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
import { CategoryTypeSelect } from "./CategoryTypeSelect.js";
import { ParentCategoryField } from "./ParentCategoryField.js";
import { useCreateCategoryForm } from "./useCreateCategoryForm.js";

type CreateCategoryModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateCategoryModal({
  open,
  onClose,
}: CreateCategoryModalProps) {
  const {
    name,
    setName,
    categoryType,
    setCategoryType,
    parentCategoryId,
    setParentCategoryId,
    parentOptions,
    createCategory,
    handleSubmit,
    handleClose,
    isFormValid,
  } = useCreateCategoryForm(open, onClose);

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

          <CategoryTypeSelect
            label="Category Type"
            value={categoryType}
            onChange={setCategoryType}
            comboboxProps={{ withinPortal: true }}
          />

          <ParentCategoryField
            parentOptions={parentOptions}
            parentCategoryId={parentCategoryId}
            onParentChange={setParentCategoryId}
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
