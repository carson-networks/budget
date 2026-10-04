import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Paper,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  formatYearMonthLabel,
  type YearMonth,
} from "../../../utils/monthRange.js";

type MonthNavigationBarProps = {
  selectedMonth: YearMonth;
  onPrev: () => void;
  onNext: () => void;
  onGoToToday: () => void;
  /** Shown only for the current month and future months. */
  showApplyToFollowingMonths: boolean;
  applyToFollowingMonths: boolean;
  onApplyToFollowingMonthsChange: (checked: boolean) => void;
};

export function MonthNavigationBar({
  selectedMonth,
  onPrev,
  onNext,
  onGoToToday,
  showApplyToFollowingMonths,
  applyToFollowingMonths,
  onApplyToFollowingMonthsChange,
}: MonthNavigationBarProps) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const headerBarStyle =
    colorScheme === "dark"
      ? {
          backgroundColor: theme.colors.dark[6],
          borderBottom: `1px solid ${theme.colors.dark[4]}`,
        }
      : {
          backgroundColor: theme.colors.gray[0],
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
        };

  return (
    <Paper
      shadow="sm"
      radius="md"
      mb="md"
      p={0}
      withBorder
      style={{ overflow: "hidden" }}
    >
      <Box px="md" py="sm" style={headerBarStyle}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Box
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-start",
              minWidth: 0,
            }}
          >
            {showApplyToFollowingMonths ? (
              <Checkbox
                label="Apply budget changes to following months"
                checked={applyToFollowingMonths}
                onChange={(e) =>
                  onApplyToFollowingMonthsChange(e.currentTarget.checked)
                }
                size="sm"
              />
            ) : null}
          </Box>
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
            <Button
              variant="light"
              color="brand"
              size="sm"
              onClick={onGoToToday}
            >
              Today
            </Button>
          </Box>
        </Group>
      </Box>
    </Paper>
  );
}
