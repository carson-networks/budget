import { describe, expect, it } from "vitest";
import type { Transaction } from "../../models";
import { groupTransactionsByDate } from "./groupTransactionsByDate.js";

function txn(id: string, isoDate?: string): Transaction {
  return {
    id,
    accountId: "acc-1",
    amount: "1.00",
    transactionName: id,
    transactionDate: isoDate ? new Date(isoDate) : undefined,
  };
}

const now = new Date(2026, 9, 9, 12);

describe("groupTransactionsByDate", () => {
  it("groups by UTC calendar day, newest first, with undated last", () => {
    const sections = groupTransactionsByDate(
      [
        txn("a", "2026-10-01T00:00:00Z"),
        txn("none"),
        txn("b", "2026-10-03T00:00:00Z"),
        txn("c", "2026-10-01T00:00:00Z"),
      ],
      now,
    );

    expect(
      sections.map((s) => [s.key, s.transactions.map((t) => t.id)]),
    ).toEqual([
      ["2026-10-03", ["b"]],
      ["2026-10-01", ["a", "c"]],
      ["undated", ["none"]],
    ]);
    expect(sections.at(-1)?.label).toBe("No date");
  });

  it("labels today and yesterday relative to now", () => {
    const [today, yesterday] = groupTransactionsByDate(
      [txn("t", "2026-10-09T00:00:00Z"), txn("y", "2026-10-08T00:00:00Z")],
      now,
    );

    expect(today.label).toBe("Today");
    expect(yesterday.label).toBe("Yesterday");
  });

  it("includes the year only for days outside the current year", () => {
    const [thisYear, lastYear] = groupTransactionsByDate(
      [txn("a", "2026-03-02T00:00:00Z"), txn("b", "2025-12-31T00:00:00Z")],
      now,
    );

    expect(thisYear.label).not.toMatch(/2026/);
    expect(lastYear.label).toMatch(/2025/);
  });
});
