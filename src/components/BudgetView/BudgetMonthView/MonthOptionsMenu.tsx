import { ActionIcon, Menu } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconCheck } from "@tabler/icons-react";

type MonthOptionsMenuProps = {
  /** When false (past months), the follow-months option is disabled. */
  canApplyToFollowingMonths: boolean;
  applyToFollowingMonths: boolean;
  onApplyToFollowingMonthsChange: (checked: boolean) => void;
};

/**
 * Compact month-bar options menu. Always present so future settings can join;
 * follow-months is disabled for past months.
 */
export function MonthOptionsMenu({
  canApplyToFollowingMonths,
  applyToFollowingMonths,
  onApplyToFollowingMonthsChange,
}: MonthOptionsMenuProps) {
  return (
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
          Apply budget changes to following months
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
