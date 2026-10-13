import { Button, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { YearMonth } from "../../../utils/monthRange.js";
import { MonthNavigationBar } from "./MonthNavigationBar.js";

type CategoryTransactionsHeaderProps = {
  categoryName: string;
  month: YearMonth;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onBack: () => void;
};

export function CategoryTransactionsHeader({
  categoryName,
  month,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onBack,
}: CategoryTransactionsHeaderProps) {
  return (
    <>
      <Title order={3} mb="md">
        {categoryName}
      </Title>
      <MonthNavigationBar
        selectedMonth={month}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
        onGoToToday={onGoToToday}
        leftSection={
          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
          >
            Back to budget
          </Button>
        }
      />
    </>
  );
}
