import { ActionIcon, Badge, Group, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import type { Category } from "../../../models";
import {
  displayCategoryKind,
  enabledStatusChip,
} from "./categoryDisplay.js";

type SegmentHeaderProps = {
  root: Category;
  onRootSettings: () => void;
};

export function SegmentHeader({ root, onRootSettings }: SegmentHeaderProps) {
  return (
    <Group justify="space-between" wrap="nowrap" align="center">
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`Settings for ${root.name}`}
          onClick={onRootSettings}
        >
          <IconSettings size={18} />
        </ActionIcon>
        <Text fw={700} size="sm">
          {root.name}
        </Text>
      </Group>
      <Group gap="xs" wrap="wrap" justify="flex-end">
        <Badge variant="outline" size="sm" color="gray">
          {displayCategoryKind(root.categoryKind)}
        </Badge>
        {enabledStatusChip(root.isDisabled)}
      </Group>
    </Group>
  );
}
