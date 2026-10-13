import { Select, type SelectProps } from "@mantine/core";
import { CATEGORY_TYPE_OPTIONS } from "./categoryTypeOptions.js";

type CategoryTypeSelectProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
  label?: string;
  comboboxProps?: SelectProps["comboboxProps"];
};

export function CategoryTypeSelect({
  value,
  onChange,
  required = true,
  label = "Category type",
  comboboxProps,
}: CategoryTypeSelectProps) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      data={CATEGORY_TYPE_OPTIONS}
      required={required}
      comboboxProps={comboboxProps}
    />
  );
}
