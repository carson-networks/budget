import { useState, useMemo } from "react";
import {
  Box,
  Loader,
  Alert,
  Table,
  Affix,
  ActionIcon,
  Paper,
  Title,
  Badge,
  Group,
  Text,
} from "@mantine/core";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import {
  useAllCategories,
  CategoryType,
  type Category,
} from "../hooks/useCategories";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../utils/categorySegments";
import type { CategoryRow } from "../utils/categorySegments";
import CreateCategoryModal from "../components/CreateCategoryModal";
import EditCategoryModal from "../components/EditCategoryModal";

/** Only Income and Expense are shown in the UI; anything else maps to Expense. */
function displayCategoryType(type: CategoryType): string {
  return type === CategoryType.INCOME ? "Income" : "Expense";
}

/** `isDisabled` from API: active categories show green Enabled; inactive show red Disabled. */
function enabledStatusChip(isDisabled: boolean) {
  if (isDisabled) {
    return (
      <Badge color="red" variant="light" size="sm">
        Disabled
      </Badge>
    );
  }
  return (
    <Badge color="green" variant="light" size="sm">
      Enabled
    </Badge>
  );
}

type SubcategoriesTableProps = {
  rows: CategoryRow[];
  onRowSettings: (category: Category) => void;
};

/** Shared column layout so each parent’s table lines up with the others. */
function SubcategoriesTable({ rows, onRowSettings }: SubcategoriesTableProps) {
  return (
    <Table
      highlightOnHover
      withTableBorder
      withColumnBorders
      verticalSpacing="xs"
      horizontalSpacing="xs"
      fz="sm"
      style={{ tableLayout: "fixed", width: "100%" }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: 48 }} />
          <Table.Th>Name</Table.Th>
          <Table.Th style={{ width: 130 }}>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map(({ category: row, depth }) => (
          <Table.Tr key={row.id}>
            <Table.Td
              style={{ verticalAlign: "middle", textAlign: "center" }}
            >
              <Box
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  aria-label={`Settings for ${row.name}`}
                  onClick={() => onRowSettings(row)}
                >
                  <IconSettings size={18} />
                </ActionIcon>
              </Box>
            </Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>
              <Box
                style={{
                  paddingLeft: depth * 24,
                  borderLeft:
                    depth > 0 ? "2px solid var(--mantine-color-brand-3)" : undefined,
                }}
              >
                {row.name}
              </Box>
            </Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>
              {enabledStatusChip(row.isDisabled)}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function CategoriesView() {
  const { categories, isLoading, error } = useAllCategories();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<Category | null>(null);

  const segments = useMemo(
    () => sortCategorySegmentsForDisplay(buildCategorySegments(categories)),
    [categories],
  );

  if (isLoading) {
    return (
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader color="brand" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ flex: 1, padding: 16 }}>
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title order={4} mb="md" c="dark.6">
        Categories
      </Title>

      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
        {segments.map((segment) => (
          <Paper
            key={segment.root.id}
            shadow="sm"
            radius="md"
            mb="md"
            p={0}
            withBorder
            style={{ overflow: "hidden" }}
          >
            <Box
              px="md"
              py="sm"
              style={{
                backgroundColor: "var(--mantine-color-gray-0)",
                borderBottom: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Group justify="space-between" wrap="nowrap" align="center">
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={`Settings for ${segment.root.name}`}
                    onClick={() => setSettingsCategory(segment.root)}
                  >
                    <IconSettings size={18} />
                  </ActionIcon>
                  <Text fw={700} size="sm">
                    {segment.root.name}
                  </Text>
                </Group>
                <Group gap="xs" wrap="wrap" justify="flex-end">
                  <Badge variant="outline" size="sm" color="gray">
                    {displayCategoryType(segment.root.categoryType)}
                  </Badge>
                  {enabledStatusChip(segment.root.isDisabled)}
                </Group>
              </Group>
            </Box>

            {segment.descendantRows.length === 0 ? (
              <Box px="md" py="md">
                <Text size="sm" c="dimmed">
                  No subcategories
                </Text>
              </Box>
            ) : (
              <SubcategoriesTable
                rows={segment.descendantRows}
                onRowSettings={setSettingsCategory}
              />
            )}
          </Paper>
        ))}
      </Box>

      <Affix position={{ bottom: 24, right: 24 }}>
        <ActionIcon
          size="xl"
          radius="xl"
          color="brand"
          aria-label="add category"
          onClick={() => setCreateModalOpen(true)}
        >
          <IconPlus size={24} />
        </ActionIcon>
      </Affix>

      <CreateCategoryModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <EditCategoryModal
        category={settingsCategory}
        opened={settingsCategory !== null}
        onClose={() => setSettingsCategory(null)}
      />
    </Box>
  );
}
