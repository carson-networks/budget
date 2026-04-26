import { TextInput, Select } from "@mantine/core";
import { AccountType } from "../../hooks/useAccounts";

const ACCOUNT_TYPES = [
  { value: String(AccountType.CASH), label: "Cash" },
  { value: String(AccountType.CREDIT_CARDS), label: "Credit Cards" },
];

type ManualAccountFieldsProps = {
  type: string | null;
  onTypeChange: (value: string | null) => void;
  subType: string;
  onSubTypeChange: (value: string) => void;
  startingBalance: string;
  onStartingBalanceChange: (value: string) => void;
};

export function ManualAccountFields({
  type,
  onTypeChange,
  subType,
  onSubTypeChange,
  startingBalance,
  onStartingBalanceChange,
}: ManualAccountFieldsProps) {
  return (
    <>
      <Select
        label="Type"
        value={type}
        onChange={onTypeChange}
        data={ACCOUNT_TYPES}
        required
        comboboxProps={{ withinPortal: true }}
      />

      <TextInput
        label="Sub Type"
        value={subType}
        onChange={(e) => onSubTypeChange(e.target.value)}
        placeholder="e.g. Checking, Savings"
        required
      />

      <TextInput
        label="Starting Balance"
        value={startingBalance}
        onChange={(e) => onStartingBalanceChange(e.target.value)}
        placeholder="0.00"
        description="Decimal amount (e.g. 0.00 or -500.00)"
        required
      />
    </>
  );
}
