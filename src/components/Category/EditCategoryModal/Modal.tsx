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
import type { Category } from "../../../models";
import { ParentCategoryField } from "../CreateCategoryModal/ParentCategoryField.js";
import { useEditCategoryForm } from "./useEditCategoryForm.js";

type EditCategoryModalProps = {
  category: Category | null;
  open: boolean;
  onClose: () => void;
};

type CategorySettingsBodyProps = {
  category: Category;
  onClose: () => void;
};

function CategorySettingsBody({
  category,
  onClose,
}: CategorySettingsBodyProps) {
  const {
    name,
    setName,
    isDisabled,
    setIsDisabled,
    parentCategoryId,
    setParentCategoryId,
    parentOptions,
    updateCategory,
    handleSubmit,
    handleClose,
    isFormValid,
    busy,
  } = useEditCategoryForm(category, onClose);

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
