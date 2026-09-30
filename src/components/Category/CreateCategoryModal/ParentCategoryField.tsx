import { Select, Checkbox, type ComboboxData } from "@mantine/core";

type ParentCategoryFieldProps = {
  parentOptions: ComboboxData;
  parentCategoryId: string | null;
  onParentChange: (value: string | null) => void;
  isParentCategory: boolean;
  onIsParentCategoryChange: (checked: boolean) => void;
};

export function ParentCategoryField({
  parentOptions,
  parentCategoryId,
  onParentChange,
  isParentCategory,
  onIsParentCategoryChange,
}: ParentCategoryFieldProps) {
  return (
    <>
      <Checkbox
        label="Parent category"
        checked={isParentCategory}
        disabled={!!parentCategoryId}
        onChange={(e) => onIsParentCategoryChange(e.currentTarget.checked)}
      />

      <Select
        label="Parent category"
        placeholder="None (top level)"
        description="Subcategories can only sit under a top-level category."
        clearable
        data={parentOptions}
        value={parentCategoryId}
        onChange={onParentChange}
        comboboxProps={{ withinPortal: true }}
      />
    </>
  );
}
