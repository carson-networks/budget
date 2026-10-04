import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Paper,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  formatYearMonthLabel,
  type YearMonth,
} from "../../../utils/monthRange.js";

export const APPLY_TO_FOLLOWING_MONTHS_LABEL =
  "Apply budget changes to following months";

type MonthNavigationBarProps = {
  selectedMonth: YearMonth;
  onPrev: () => void;
  onNext: () => void;
  onGoToToday: () => void;
  /** When false (past months), the follow-months option is disabled. */
  canApplyToFollowingMonths: boolean;
  applyToFollowingMonths: boolean;
  onApplyToFollowingMonthsChange: (checked: boolean) => void;
};

export function MonthNavigationBar({
  selectedMonth,
  onPrev,
  onNext,
  onGoToToday,
  canApplyToFollowingMonths,
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
            <Menu position="bottom-start" shadow="md" width={280} withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Month options"
                  aria-haspopup="menu"
                >
                  <IconAdjustmentsHorizontal size={20} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  disabled={!canApplyToFollowingMonths}
                  leftSection={
                    applyToFollowingMonths && canApplyToFollowingMonths ? (
                      <IconCheck size={14} aria-hidden />
                    ) : (
                      <span style={{ width: 14 }} aria-hidden />
                    )
                  }
                  closeMenuOnClick={false}
                  onClick={() => {
                    if (!canApplyToFollowingMonths) return;
                    onApplyToFollowingMonthsChange(!applyToFollowingMonths);
                  }}
                >
                  {APPLY_TO_FOLLOWING_MONTHS_LABEL}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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
