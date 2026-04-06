import { useState, useMemo } from "react";
import {
  Drawer,
  Box,
  Stack,
  Group,
  Title,
  ActionIcon,
  TextInput,
  Select,
  Button,
  Alert,
  Loader,
  Switch,
  Text,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import {
  useCreateCategory,
  useAllCategories,
  type CreateCategoryInput,
} from "../hooks/useCategories";
import { CategoryType } from "../gen/category/v1/category_pb.js";

interface CreateCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 420;

const CATEGORY_TYPES = [
  { value: "0", label: "Income" },
  { value: "1", label: "Expense" },
];

export default function CreateCategoryDrawer({ open, onClose }: CreateCategoryDrawerProps) {
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState<string | null>("1");
  const [isParent, setIsParent] = useState(true);
  const [parentCategoryID, setParentCategoryID] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  const { categories } = useAllCategories();
  const createCategory = useCreateCategory();

  const parentOptions = useMemo(
    () =>
      categories
        .filter((c) => c.isParent)
        .map((c) => ({ value: c.id, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  );

  const resetForm = () => {
    setName("");
    setCategoryType("1");
    setIsParent(true);
    setParentCategoryID(null);
    setIsDisabled(false);
    createCategory.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryType === null) return;

    const body: CreateCategoryInput = {
      name: name.trim(),
      isParent,
      isDisabled,
      categoryType: Number(categoryType) as CategoryType,
    };

    if (!isParent) {
      if (!parentCategoryID) return;
      body.parentCategoryId = parentCategoryID;
    } else if (parentCategoryID) {
      body.parentCategoryId = parentCategoryID;
    }

    createCategory.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const parentGroupsExist = parentOptions.length > 0;
  const needsParent = !isParent;
  const parentRequiredInvalid = needsParent && !parentCategoryID;
  const isFormValid =
    name.trim().length > 0 &&
    categoryType !== null &&
    (!needsParent || parentCategoryID != null);

  return (
    <Drawer
      position="right"
      opened={open}
      onClose={handleClose}
      title={null}
      withCloseButton={false}
      size={DRAWER_WIDTH}
      styles={{ body: { height: "100%", display: "flex", flexDirection: "column" } }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Group
          justify="space-between"
          mb="md"
          pb="md"
          style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
        >
          <Title order={4} c="teal.7">
            New Category
          </Title>
          <ActionIcon variant="subtle" onClick={handleClose} aria-label="close">
            <IconX size={20} />
          </ActionIcon>
        </Group>

        <Stack gap="md" style={{ flex: 1 }} mb="md">
          {createCategory.isError && (
            <Alert color="red" title="Error">
              {createCategory.error.message}
            </Alert>
          )}

          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Type"
            value={categoryType}
            onChange={setCategoryType}
            data={CATEGORY_TYPES}
            required
          />

          <Switch
            label="Group (parent category)"
            description="Groups hold subcategories; turn off to add a category under a group."
            checked={isParent}
            onChange={(e) => {
              setIsParent(e.currentTarget.checked);
              if (e.currentTarget.checked) {
                setParentCategoryID(null);
              }
            }}
            color="teal"
          />

          <Select
            label={isParent ? "Parent group (optional)" : "Parent group"}
            placeholder={parentGroupsExist ? "Select parent" : "Create a group first"}
            data={parentOptions}
            value={parentCategoryID}
            onChange={setParentCategoryID}
            clearable={isParent}
            required={needsParent}
            disabled={!parentGroupsExist && needsParent}
            error={parentRequiredInvalid ? "A parent group is required" : undefined}
            description={
              isParent
                ? "Nest this group under another group, or leave empty for a top-level group."
                : undefined
            }
          />

          {!parentGroupsExist && needsParent && (
            <Text size="sm" c="dimmed">
              Add at least one group (parent category) before creating a subcategory.
            </Text>
          )}

          <Switch
            label="Disabled"
            description="When disabled, the category is hidden from new transactions."
            checked={isDisabled}
            onChange={(e) => setIsDisabled(e.currentTarget.checked)}
            color="gray"
          />
        </Stack>

        <Box pt="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
          <Button
            type="submit"
            fullWidth
            color="teal"
            disabled={!isFormValid || createCategory.isPending}
            leftSection={createCategory.isPending ? <Loader size="sm" /> : null}
          >
            {createCategory.isPending ? "Creating..." : "Create Category"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
