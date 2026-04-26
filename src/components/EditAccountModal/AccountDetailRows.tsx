import { Text } from "@mantine/core";
import type { Account } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/format";

type AccountDetailRowsProps = {
  account: Account;
};

export function AccountDetailRows({ account }: AccountDetailRowsProps) {
  return (
    <>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Name
        </Text>
        <Text size="sm">{account.name}</Text>
      </div>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Sub type
        </Text>
        <Text size="sm">{account.subType}</Text>
      </div>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Balance
        </Text>
        <Text size="sm" fw={500}>
          {formatCurrency(account.balance)}
        </Text>
      </div>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Starting balance
        </Text>
        <Text size="sm">{formatCurrency(account.startingBalance)}</Text>
      </div>
    </>
  );
}
