import { Modal, Title } from "@mantine/core";
import {
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from "../../hooks/useCategories";
import { CategorySettingsForm } from "./CategorySettingsForm";

interface EditCategoryModalProps {
  category: Category | null;
  opened: boolean;
  onClose: () => void;
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
