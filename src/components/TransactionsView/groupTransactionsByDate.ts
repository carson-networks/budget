import type { Transaction } from "../../models";

export type TransactionDateSection = {
  key: string;
  label: string;
  transactions: Transaction[];
};

const UNDATED_KEY = "undated";

// Transaction dates are calendar days stored as UTC midnight (matching the
// server's UTC month filter), so they are read in UTC to avoid shifting a day.
function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function sectionLabel(key: string, date: Date, now: Date): string {
  if (key === localDayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === localDayKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getUTCFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function groupTransactionsByDate(
  transactions: readonly Transaction[],
  now: Date = new Date(),
): TransactionDateSection[] {
  const sections = new Map<string, TransactionDateSection>();

  for (const txn of transactions) {
    const date = txn.transactionDate;
    const key = date ? utcDayKey(date) : UNDATED_KEY;
    let section = sections.get(key);
    if (!section) {
      section = {
        key,
        label: date ? sectionLabel(key, date, now) : "No date",
        transactions: [],
      };
      sections.set(key, section);
    }
    section.transactions.push(txn);
  }

  return [...sections.values()].sort((a, b) => {
    if (a.key === UNDATED_KEY) return 1;
    if (b.key === UNDATED_KEY) return -1;
    return b.key.localeCompare(a.key);
  });
}
