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
      clearable
      data={parentOptions}
      value={parentCategoryId}
      onChange={onParentChange}
      comboboxProps={{ withinPortal: true }}
    />
  );
}
