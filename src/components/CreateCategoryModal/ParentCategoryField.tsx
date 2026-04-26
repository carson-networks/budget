import { Select, Checkbox } from "@mantine/core";
import type { ComboboxData } from "@mantine/core";

type ParentCategoryFieldProps = {
  parentOptions: ComboboxData;
  parentCategoryId: string | null;
  onParentChange: (value: string | null) => void;
  isGroup: boolean;
  onIsGroupChange: (checked: boolean) => void;
};

export function ParentCategoryField({
  parentOptions,
  parentCategoryId,
  onParentChange,
  isGroup,
  onIsGroupChange,
}: ParentCategoryFieldProps) {
  return (
    <>
      <Select
        label="Parent category"
        placeholder="None (top level)"
        description="Subcategories can only sit under a top-level category."
        clearable
        data={parentOptions}
        value={parentCategoryId}
        onChange={onParentChange}
      />

      <Checkbox
        label="Group category (can contain subcategories)"
        checked={isGroup}
        disabled={!!parentCategoryId}
        onChange={(e) => onIsGroupChange(e.currentTarget.checked)}
      />
    </>
  );
}
