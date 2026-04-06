import { useState, useMemo } from "react";
import {
  Box,
  Loader,
  Alert,
  Table,
  Pagination,
  Affix,
  ActionIcon,
  Paper,
  Title,
  Text,
  Badge,
  Group,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useAllCategories } from "../hooks/useCategories";
import { flattenCategoryTree } from "../util/categoryTree";
import { formatTimestamp } from "../util/formatTimestamp";
import CreateCategoryDrawer from "../components/CreateCategoryDrawer";

const DEFAULT_PAGE_SIZE = 25;

const CATEGORY_TYPE_LABELS: Record<number, string> = {
  0: "Income",
  1: "Expense",
};

export default function CategoriesView() {
  const { categories, isLoading, error } = useAllCategories();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  const rows = useMemo(() => flattenCategoryTree(categories), [categories]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const totalPages = Math.ceil(rows.length / pageSize) || 1;

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
        <Loader color="teal" />
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
      <Paper
        shadow="sm"
        radius="md"
        p={0}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedRows.map(({ category: c, depth }) => (
                <Table.Tr key={c.id}>
                  <Table.Td>
                    <Box pl={`calc(${depth} * 1.25rem)`}>
                      <Group gap="xs" wrap="nowrap" align="center">
                        <Text fw={c.isParent ? 600 : 400} size="sm" component="span">
                          {c.name}
                        </Text>
                        {c.isDisabled ? (
                          <Badge color="gray" variant="light" size="sm">
                            Disabled
                          </Badge>
                        ) : null}
                      </Group>
                    </Box>
                  </Table.Td>
                  <Table.Td>
                    {CATEGORY_TYPE_LABELS[c.categoryType] ?? c.categoryType}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatTimestamp(c.createdAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {rows.length > 0 && (
          <Box
            py="md"
            style={{
              display: "flex",
              justifyContent: "center",
              borderTop: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
              color="teal"
            />
          </Box>
        )}
      </Paper>

      <Affix position={{ bottom: 24, right: 24 }}>
        <ActionIcon
          size="xl"
          radius="xl"
          color="teal"
          aria-label="add category"
          onClick={() => setDrawerOpen(true)}
        >
          <IconPlus size={24} />
        </ActionIcon>
      </Affix>

      <CreateCategoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
