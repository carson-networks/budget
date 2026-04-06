import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Box,
  Loader,
  Alert,
  Table,
  Pagination,
  Paper,
  Title,
  Text,
  Group,
  ActionIcon,
  Button,
  Progress,
  Badge,
  Tooltip,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconCalendarRepeat } from "@tabler/icons-react";
import { useAllCategories } from "../hooks/useCategories";
import type { Category } from "../hooks/useCategories";
import {
  useBudgetsForMonth,
  useTransactionTotalsForMonth,
  useSetBudget,
} from "../hooks/useBudgets";
import {
  categoryNameById,
  formatCategoryDisplayName,
  flattenCategoryTree,
} from "../util/categoryTree";
import {
  formatUsdNumberPart,
  normalizeBudgetInput,
  parseBudgetAmount,
} from "../util/budgetCurrency";
import BudgetAmountInput from "../components/BudgetAmountInput";
import FutureBudgetModal from "../components/FutureBudgetModal";

const DEFAULT_PAGE_SIZE = 25;

/** Fixed pixel widths for numeric/action columns; category column takes the remainder. */
const COL = {
  budget: { width: 148, minWidth: 148, maxWidth: 148 },
  spent: { width: 112, minWidth: 112, maxWidth: 112 },
  left: { width: 112, minWidth: 112, maxWidth: 112 },
  progress: { width: 200, minWidth: 200, maxWidth: 200 },
  actions: { width: 52, minWidth: 52, maxWidth: 52 },
} as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function parseDecimal(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Spending toward budget: use magnitude of the month's total (expenses often stored negative). */
function spentForBudget(totalStr: string): number {
  return Math.abs(parseDecimal(totalStr));
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shouldPersistBudget(saved: string | null, rawInput: string): boolean {
  const norm = normalizeBudgetInput(rawInput);
  if (norm === "") {
    return false;
  }
  const next = parseBudgetAmount(rawInput);
  if (next === null) {
    return false;
  }
  if (saved == null || saved === "") {
    return true;
  }
  const prev = parseDecimal(saved);
  return Math.abs(prev - next) >= 1e-6;
}

export default function BudgetView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  /** Draft budget text while editing; key only present when user has typed away from server value for that row. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [futureModalCategory, setFutureModalCategory] = useState<Category | null>(null);

  const setBudget = useSetBudget();

  /** Use `reset` only so the callback stays stable if the mutation object identity changes. */
  const resetBudgetMutation = useCallback(() => {
    setBudget.reset();
  }, [setBudget]);

  useEffect(() => {
    // Clearing local draft inputs when the visible month changes is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drafts to selected month
    setDrafts({});
  }, [year, month]);

  const { categories, isLoading: catLoading, error: catError } = useAllCategories();
  const {
    data: budgets,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudgetsForMonth(year, month);
  const {
    data: totalsBody,
    isLoading: totalsLoading,
    error: totalsError,
  } = useTransactionTotalsForMonth(year, month);

  const nameById = useMemo(() => categoryNameById(categories), [categories]);

  const budgetByCategoryId = useMemo(() => {
    const m = new Map<string, string>();
    if (!budgets) return m;
    for (const b of budgets) {
      if (b.categoryId) {
        m.set(b.categoryId, b.amount);
      }
    }
    return m;
  }, [budgets]);

  const spentByCategoryId = useMemo(() => {
    const m = new Map<string, string>();
    const byMonth = totalsBody?.byMonth ?? [];
    const entry = byMonth.find((x) => x.year === year && x.month === month);
    if (!entry?.byCategory) return m;
    for (const row of entry.byCategory) {
      if (row.categoryId) {
        m.set(row.categoryId, row.total);
      }
    }
    return m;
  }, [totalsBody, year, month]);

  const treeRows = useMemo(
    () => flattenCategoryTree(categories),
    [categories]
  );

  const rows = useMemo(() => {
    return treeRows.map(({ category: c, depth }) => {
      const isParent = c.isParent;
      const canEditBudget = !isParent && !c.isDisabled;

      const budgetStr = budgetByCategoryId.get(c.id) ?? null;
      const totalStr = spentByCategoryId.get(c.id) ?? "0";
      const budgetNum = budgetStr != null ? parseDecimal(budgetStr) : null;
      const spentNum = isParent ? null : spentForBudget(totalStr);
      const remaining =
        !isParent && budgetNum != null && spentNum != null
          ? budgetNum - spentNum
          : null;
      const pctOfBudget =
        !isParent && budgetNum != null && budgetNum > 0 && spentNum != null
          ? (spentNum / budgetNum) * 100
          : null;

      return {
        category: c,
        depth,
        canEditBudget,
        budgetStr: isParent ? null : budgetStr,
        spentNum,
        remaining,
        pctOfBudget,
      };
    });
  }, [treeRows, budgetByCategoryId, spentByCategoryId]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const totalPages = Math.ceil(rows.length / pageSize) || 1;

  const isLoading = catLoading || budgetLoading || totalsLoading;
  const error = catError ?? budgetError ?? totalsError;

  const saveBudget = useCallback(
    (
      categoryId: string,
      amount: string,
      overwriteFutureMonths: boolean,
      onSuccess?: () => void
    ) => {
      setSavingCategoryId(categoryId);
      setBudget.mutate(
        {
          categoryId,
          month,
          year,
          amount,
          overwriteFutureMonths,
        },
        {
          onSettled: () => {
            setSavingCategoryId(null);
          },
          onSuccess: () => {
            setDrafts((d) => {
              const next = { ...d };
              delete next[categoryId];
              return next;
            });
            onSuccess?.();
          },
        }
      );
    },
    [setBudget, month, year]
  );

  const handleBudgetDraftChange = useCallback((categoryId: string, value: string) => {
    setDrafts((d) => ({ ...d, [categoryId]: value }));
  }, []);

  const handleBudgetCommit = useCallback(
    (categoryId: string, saved: string | null, raw: string) => {
      if (normalizeBudgetInput(raw) === "") {
        setDrafts((d) => {
          const next = { ...d };
          delete next[categoryId];
          return next;
        });
        return;
      }

      if (!shouldPersistBudget(saved, raw)) {
        setDrafts((d) => {
          const next = { ...d };
          delete next[categoryId];
          return next;
        });
        return;
      }

      const norm = normalizeBudgetInput(raw);
      saveBudget(categoryId, norm, false);
    },
    [saveBudget]
  );

  const handleFutureModalSave = useCallback(
    (amount: string, overwriteFutureMonths: boolean) => {
      if (!futureModalCategory) return;
      saveBudget(futureModalCategory.id, amount, overwriteFutureMonths, () => {
        setFutureModalCategory(null);
      });
    },
    [futureModalCategory, saveBudget]
  );

  const goPrevMonth = () => {
    const n = addMonths(year, month, -1);
    setYear(n.year);
    setMonth(n.month);
    setPage(1);
  };

  const goNextMonth = () => {
    const n = addMonths(year, month, 1);
    setYear(n.year);
    setMonth(n.month);
    setPage(1);
  };

  const goCurrentMonth = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
    setPage(1);
  };

  const futureInitialAmount =
    futureModalCategory != null
      ? futureModalCategory.id in drafts
        ? drafts[futureModalCategory.id]
        : (() => {
            const s = budgetByCategoryId.get(futureModalCategory.id);
            return s != null ? formatUsdNumberPart(parseDecimal(s)) : "";
          })()
      : "";

  if (isLoading) {
    return (
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader color="teal" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ flex: 1, padding: 16 }}>
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group justify="space-between" mb="md" wrap="wrap" align="center">
        <Title order={4} c="dark.6">
          Budget
        </Title>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="teal"
            size="lg"
            aria-label="Previous month"
            onClick={goPrevMonth}
          >
            <IconChevronLeft size={20} />
          </ActionIcon>
          <Text fw={600} maw={280} ta="center" style={{ flex: "0 0 auto" }}>
            {monthLabel(year, month)}
          </Text>
          <ActionIcon
            variant="light"
            color="teal"
            size="lg"
            aria-label="Next month"
            onClick={goNextMonth}
          >
            <IconChevronRight size={20} />
          </ActionIcon>
          <Button variant="light" color="teal" size="xs" onClick={goCurrentMonth}>
            Today
          </Button>
        </Group>
      </Group>

      {setBudget.isError && setBudget.error != null ? (
        <Alert
          color="red"
          title="Could not save budget"
          mb="md"
          onClose={resetBudgetMutation}
          withCloseButton
        >
          {setBudget.error instanceof Error
            ? setBudget.error.message
            : String(setBudget.error)}
        </Alert>
      ) : null}

      <Paper
        shadow="sm"
        radius="md"
        p={0}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
            style={{ width: "100%", tableLayout: "fixed" }}
          >
            <colgroup>
              <col />
              <col style={{ width: COL.budget.width }} />
              <col style={{ width: COL.spent.width }} />
              <col style={{ width: COL.left.width }} />
              <col style={{ width: COL.progress.width }} />
              <col style={{ width: COL.actions.width }} />
            </colgroup>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th ta="right" style={COL.budget}>
                  Budget
                </Table.Th>
                <Table.Th ta="right" style={COL.spent}>
                  Spent
                </Table.Th>
                <Table.Th ta="right" style={COL.left}>
                  Left
                </Table.Th>
                <Table.Th style={COL.progress}>Progress</Table.Th>
                <Table.Th style={COL.actions} aria-label="Budget options" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedRows.map((row) => {
                const c = row.category;
                const saved = row.budgetStr;
                const displayValue =
                  c.id in drafts
                    ? drafts[c.id]
                    : saved != null
                      ? formatUsdNumberPart(parseDecimal(saved))
                      : "";
                const isSaving = savingCategoryId === c.id;

                return (
                  <Table.Tr key={c.id}>
                    <Table.Td style={{ overflow: "hidden", maxWidth: 0 }}>
                      <Box pl={`calc(${row.depth} * 1.25rem)`}>
                        <Group gap="xs" wrap="nowrap" align="center">
                          <Text
                            fw={c.isParent ? 600 : 400}
                            size="sm"
                            component="span"
                            lineClamp={2}
                          >
                            {c.name}
                          </Text>
                          {c.isDisabled ? (
                            <Badge color="gray" variant="light" size="sm">
                              Disabled
                            </Badge>
                          ) : null}
                        </Group>
                      </Box>
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      style={{ ...COL.budget, verticalAlign: "middle" }}
                    >
                      {row.canEditBudget ? (
                        <BudgetAmountInput
                          variant="table"
                          size="xs"
                          value={displayValue}
                          onChange={(v) => handleBudgetDraftChange(c.id, v)}
                          onCommit={(v) => handleBudgetCommit(c.id, saved, v)}
                          disabled={isSaving}
                          aria-label={`Budget for ${c.name}`}
                        />
                      ) : (
                        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                          {saved != null
                            ? formatCurrency(parseDecimal(saved))
                            : "—"}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      style={{ ...COL.spent, verticalAlign: "middle" }}
                    >
                      <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                        {row.spentNum != null
                          ? formatCurrency(row.spentNum)
                          : "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      style={{ ...COL.left, verticalAlign: "middle" }}
                    >
                      <Text
                        size="sm"
                        style={{ whiteSpace: "nowrap" }}
                        c={
                          row.remaining != null && row.remaining < 0
                            ? "red"
                            : undefined
                        }
                      >
                        {row.remaining != null
                          ? formatCurrency(row.remaining)
                          : "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ ...COL.progress, verticalAlign: "middle" }}>
                      {row.pctOfBudget != null ? (
                        <Box>
                          <Progress
                            value={Math.min(row.pctOfBudget, 100)}
                            color={row.pctOfBudget > 100 ? "red" : "teal"}
                            size="lg"
                            radius="sm"
                          />
                          <Text size="xs" c="dimmed" mt={4}>
                            {Math.round(row.pctOfBudget)}% of budget
                          </Text>
                        </Box>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ ...COL.actions, verticalAlign: "middle" }}>
                      {row.canEditBudget ? (
                        <Tooltip label="Future month options" position="left">
                          <span>
                            <ActionIcon
                              variant="subtle"
                              color="teal"
                              aria-label="Future month budget options"
                              loading={isSaving}
                              onClick={() => {
                                resetBudgetMutation();
                                setFutureModalCategory(c);
                              }}
                            >
                              <IconCalendarRepeat size={18} />
                            </ActionIcon>
                          </span>
                        </Tooltip>
                      ) : null}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>

        {rows.length > 0 && (
          <Box
            py="md"
            style={{
              display: "flex",
              justifyContent: "center",
              borderTop: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
              color="teal"
            />
          </Box>
        )}

        {rows.length === 0 && (
          <Box p="xl" style={{ textAlign: "center" }}>
            <Text c="dimmed" size="sm">
              No categories yet. Add categories under Categories to build your budget tree.
            </Text>
          </Box>
        )}
      </Paper>

      {futureModalCategory ? (
        <FutureBudgetModal
          key={`${futureModalCategory.id}-${year}-${month}`}
          opened
          onClose={() => {
            setFutureModalCategory(null);
            resetBudgetMutation();
          }}
          categoryLabel={formatCategoryDisplayName(futureModalCategory, nameById)}
          monthLabel={monthLabel(year, month)}
          initialAmount={futureInitialAmount}
          isPending={setBudget.isPending}
          error={setBudget.error}
          onSave={handleFutureModalSave}
        />
      ) : null}
    </Box>
  );
}
