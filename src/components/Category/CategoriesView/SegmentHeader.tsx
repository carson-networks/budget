import { Badge, Group, Text } from "@mantine/core";
import type { Category } from "../../../models";
import {
  displayCategoryKind,
  enabledStatusChip,
} from "./categoryDisplay.js";

type SegmentHeaderProps = {
  root: Category;
};

export function SegmentHeader({ root }: SegmentHeaderProps) {
  return (
    <Group justify="space-between" wrap="nowrap" align="center">
      <Text fw={700} size="sm">
        {root.name}
      </Text>
      <Group gap="xs" wrap="wrap" justify="flex-end">
        <Badge variant="outline" size="sm" color="gray">
          {displayCategoryKind(root.categoryKind)}
        </Badge>
        {enabledStatusChip(root.isDisabled)}
      </Group>
    </Group>
  );
}
