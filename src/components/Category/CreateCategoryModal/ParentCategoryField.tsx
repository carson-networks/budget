import { Select, type ComboboxData } from "@mantine/core";

type ParentCategoryFieldProps = {
  parentOptions: ComboboxData;
  parentCategoryId: string | null;
  onParentChange: (value: string | null) => void;
};

export function ParentCategoryField({
  parentOptions,
  parentCategoryId,
  onParentChange,
}: ParentCategoryFieldProps) {
  return (
    <Select
      label="Parent category"
      placeholder="None (top level)"
      description="Leave empty to create a top-level parent category. Subcategories can only sit under a top-level category."
      clearable
      data={parentOptions}
      value={parentCategoryId}
      onChange={onParentChange}
      comboboxProps={{ withinPortal: true }}
    />
  );
}
