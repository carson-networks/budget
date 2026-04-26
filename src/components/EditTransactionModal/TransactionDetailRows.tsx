import { Text } from "@mantine/core";
import { formatCurrency } from "../../utils/format";

type TransactionDetailRowsProps = {
  transactionName: string;
  accountLabel: string;
  amount: string;
  dateLabel: string;
};

export function TransactionDetailRows({
  transactionName,
  accountLabel,
  amount,
  dateLabel,
}: TransactionDetailRowsProps) {
  return (
    <>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Name
        </Text>
        <Text size="sm">{transactionName}</Text>
      </div>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Account
        </Text>
        <Text size="sm">{accountLabel}</Text>
      </div>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Amount
        </Text>
        <Text size="sm" fw={500}>
          {formatCurrency(amount)}
        </Text>
      </div>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Date
        </Text>
        <Text size="sm">{dateLabel}</Text>
      </div>
    </>
  );
}
