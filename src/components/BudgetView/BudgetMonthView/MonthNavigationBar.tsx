import { Paper, Box, Group, Text, ActionIcon, Button } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { formatYearMonthLabel, type YearMonth } from "../../../utils/monthRange";

const headerStripStyle = {
  backgroundColor: "var(--mantine-color-gray-0)",
  borderBottom: "1px solid var(--mantine-color-default-border)",
} as const;

type MonthNavigationBarProps = {
  selectedMonth: YearMonth;
  onPrev: () => void;
  onNext: () => void;
  onGoToToday: () => void;
};

export function MonthNavigationBar({
  selectedMonth,
  onPrev,
  onNext,
  onGoToToday,
}: MonthNavigationBarProps) {
  return (
    <Paper
      shadow="sm"
      radius="md"
      mb="md"
      p={0}
      withBorder
      style={{ overflow: "hidden" }}
    >
      <Box px="md" py="sm" style={headerStripStyle}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Box style={{ flex: 1 }} />
          <Group gap="md" wrap="nowrap" justify="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Previous month"
              onClick={onPrev}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Text
              fw={700}
              size="sm"
              c="brand.7"
              style={{ minWidth: 160, textAlign: "center" }}
            >
              {formatYearMonthLabel(selectedMonth)}
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Next month"
              onClick={onNext}
            >
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          <Box
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button variant="light" color="brand" size="sm" onClick={onGoToToday}>
              Today
            </Button>
          </Box>
        </Group>
      </Box>
    </Paper>
  );
}
