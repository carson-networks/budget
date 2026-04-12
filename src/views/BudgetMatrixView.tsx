import {
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
  Fragment,
} from "react";
import {
  Box,
  Loader,
  Alert,
  Paper,
  Group,
  Button,
  Text,
  Badge,
  Checkbox,
} from "@mantine/core";
import { useAllCategories, CategoryType } from "../hooks/useCategories";
import { useBudgetsForRange } from "../hooks/useBudgets";
import { useAllTransactions } from "../hooks/useTransactions";
import { BudgetCellInput } from "../components/BudgetCellInput";
import { rollUpBudgetByType } from "../utils/budgetRollups";
import { buildActualsByYearMonth } from "../utils/transactionMonthBuckets";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../utils/categorySegments";
import {
  addMonths,
  currentYearMonth,
  formatYearMonthLabel,
  monthsBetweenInclusive,
  yearMonthKey,
} from "../utils/monthRange";

/** Starting window: months on each side of “today” (inclusive span = 2× + 1). */
const INITIAL_MONTHS_EACH_SIDE = 36;
/** How many months to add when scrolling near an edge. */
const EXTEND_CHUNK = 12;
/** Distance from horizontal edge (px) that triggers loading more months. */
const EDGE_THRESHOLD_PX = 100;
/** Cap total months in the matrix to avoid unbounded memory use (~41 years). */
const MAX_TOTAL_MONTHS = 500;

/** Fixed column width so scroll compensation stays in sync with “current month” index. */
const MONTH_COLUMN_PX = 100;
const CATEGORY_COLUMN_MIN_PX = 220;

/** Left edge of January columns — strong rule between calendar years. */
const YEAR_DIVIDER_LEFT = "3px solid var(--mantine-color-dark-5)";

/** Keeps Budgeted (input) and Actual/Net (text) rows the same height. */
const MATRIX_VALUE_CELL_LINE_HEIGHT = 1.45;

type MatrixValueMode = "budgeted" | "actual" | "net";

function displayCategoryType(type: CategoryType): string {
  return type === CategoryType.INCOME ? "Income" : "Expense";
}

function formatMatrixValue(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseBudgetAmount(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

function categoryVariance(
  categoryType: CategoryType,
  budget: number | undefined,
  actual: number | undefined,
): number {
  const b = budget ?? 0;
  const a = actual ?? 0;
  if (categoryType === CategoryType.INCOME) return a - b;
  return b + a;
}

/** Single numeric cell for the matrix; `undefined` means show an em dash. */
function matrixCellNumber(
  mode: MatrixValueMode,
  categoryType: CategoryType,
  budgetRaw: string | undefined,
  actual: number | undefined,
): number | undefined {
  const budgetNum = parseBudgetAmount(budgetRaw);
  if (mode === "budgeted") return budgetNum;
  if (mode === "actual") {
    if (actual === undefined) return undefined;
    return actual;
  }
  return categoryVariance(categoryType, budgetNum, actual);
}

function totalForMode(
  summary: ReturnType<typeof rollUpBudgetByType>,
  mode: MatrixValueMode,
): number {
  if (mode === "budgeted") return summary.net.budget;
  if (mode === "actual") return summary.net.actual;
  return summary.net.difference;
}

export default function BudgetMatrixView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);
  const pendingScrollAdjustRef = useRef(0);
  const extendingRef = useRef(false);

  const [valueMode, setValueMode] = useState<MatrixValueMode>("budgeted");
  const [applyToFutureMonths, setApplyToFutureMonths] = useState(false);

  const nowYm = useMemo(() => currentYearMonth(), []);

  const [rangeStart, setRangeStart] = useState(() =>
    addMonths(nowYm, -INITIAL_MONTHS_EACH_SIDE),
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    addMonths(nowYm, INITIAL_MONTHS_EACH_SIDE),
  );

  const months = useMemo(
    () => monthsBetweenInclusive(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const currentMonthIndex = useMemo(() => {
    const idx = months.findIndex(
      (m) => m.year === nowYm.year && m.month === nowYm.month,
    );
    return idx >= 0 ? idx : 0;
  }, [months, nowYm]);

  const { categories, isLoading: categoriesLoading } = useAllCategories();
  const { transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: budgetsResponse, error } = useBudgetsForRange(
    rangeStart,
    rangeEnd,
  );

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.isDisabled),
    [categories],
  );

  const segments = useMemo(
    () =>
      sortCategorySegmentsForDisplay(buildCategorySegments(visibleCategories)),
    [visibleCategories],
  );

  const budgetByKey = useMemo(() => {
    const m = new Map<string, string>();
    const list = budgetsResponse?.budgets ?? [];
    for (const b of list) {
      m.set(`${b.categoryId}|${b.year}|${b.month}`, b.amount);
    }
    return m;
  }, [budgetsResponse]);

  const actualsByYearMonth = useMemo(
    () => buildActualsByYearMonth(transactions),
    [transactions],
  );

  const monthSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof rollUpBudgetByType>>();
    for (const ym of months) {
      const k = yearMonthKey(ym);
      const actualMap = actualsByYearMonth.get(k) ?? new Map<string, number>();
      map.set(
        k,
        rollUpBudgetByType(
          visibleCategories,
          (id) => {
            const raw = budgetByKey.get(`${id}|${ym.year}|${ym.month}`);
            if (raw === undefined) return undefined;
            const n = parseFloat(raw);
            return Number.isNaN(n) ? undefined : n;
          },
          (id) => actualMap.get(id),
        ),
      );
    }
    return map;
  }, [months, visibleCategories, budgetByKey, actualsByYearMonth]);

  const budgetsReady = !!budgetsResponse;
  const showFullLoader =
    categoriesLoading ||
    transactionsLoading ||
    (!budgetsReady && !error);

  const scrollToCurrentMonth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: currentMonthIndex * MONTH_COLUMN_PX,
      behavior: "smooth",
    });
  }, [currentMonthIndex]);

  const tryExtendFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || extendingRef.current) return;

    const { scrollLeft, clientWidth, scrollWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    if (maxScroll === 0) return;

    const totalMonths = months.length;
    if (totalMonths >= MAX_TOTAL_MONTHS) return;

    if (scrollLeft <= EDGE_THRESHOLD_PX) {
      if (totalMonths + EXTEND_CHUNK > MAX_TOTAL_MONTHS) return;
      extendingRef.current = true;
      pendingScrollAdjustRef.current = EXTEND_CHUNK * MONTH_COLUMN_PX;
      setRangeStart((s) => addMonths(s, -EXTEND_CHUNK));
      return;
    }

    if (scrollLeft >= maxScroll - EDGE_THRESHOLD_PX) {
      if (totalMonths + EXTEND_CHUNK > MAX_TOTAL_MONTHS) return;
      extendingRef.current = true;
      setRangeEnd((e) => addMonths(e, EXTEND_CHUNK));
    }
  }, [months.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || showFullLoader) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        tryExtendFromScroll();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [showFullLoader, tryExtendFromScroll]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || showFullLoader || !budgetsResponse) return;

    if (pendingScrollAdjustRef.current > 0) {
      el.scrollLeft += pendingScrollAdjustRef.current;
      pendingScrollAdjustRef.current = 0;
    } else if (!didInitialScrollRef.current) {
      el.scrollLeft = currentMonthIndex * MONTH_COLUMN_PX;
      didInitialScrollRef.current = true;
    }

    extendingRef.current = false;
  }, [
    rangeStart,
    rangeEnd,
    currentMonthIndex,
    showFullLoader,
    budgetsResponse,
    months.length,
  ]);

  if (showFullLoader) {
    return (
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader color="brand" />
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

  const stickyBg = "var(--mantine-color-body)";
  const headerBg = "var(--mantine-color-gray-0)";
  const segmentRowBg = "var(--mantine-color-gray-0)";
  const border = "1px solid var(--mantine-color-default-border)";

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        paddingRight: 2,
      }}
    >
      <Paper
        shadow="sm"
        radius="md"
        mb="md"
        p={0}
        withBorder
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          px="md"
          py="sm"
          style={{
            backgroundColor: "var(--mantine-color-gray-0)",
            borderBottom: border,
            flexShrink: 0,
          }}
        >
          <Group justify="space-between" wrap="wrap" align="center" gap="sm">
            <Group gap="sm" wrap="wrap" align="center">
              <Button.Group>
                <Button
                  size="xs"
                  variant={valueMode === "budgeted" ? "light" : "default"}
                  color={valueMode === "budgeted" ? "brand" : "gray"}
                  onClick={() => setValueMode("budgeted")}
                  styles={{
                    label: { whiteSpace: "normal", lineHeight: 1.25 },
                  }}
                >
                  Budgeted
                </Button>
                <Button
                  size="xs"
                  variant={valueMode === "actual" ? "light" : "default"}
                  color={valueMode === "actual" ? "brand" : "gray"}
                  onClick={() => setValueMode("actual")}
                  styles={{
                    label: { whiteSpace: "normal", lineHeight: 1.25 },
                  }}
                >
                  Actual
                </Button>
                <Button
                  size="xs"
                  variant={valueMode === "net" ? "light" : "default"}
                  color={valueMode === "net" ? "brand" : "gray"}
                  onClick={() => setValueMode("net")}
                  styles={{
                    label: { whiteSpace: "normal", lineHeight: 1.25 },
                  }}
                >
                  Net
                </Button>
              </Button.Group>
              {valueMode === "budgeted" && (
                <Checkbox
                  label="Apply changes to future months"
                  size="xs"
                  radius={0}
                  checked={applyToFutureMonths}
                  onChange={(e) =>
                    setApplyToFutureMonths(e.currentTarget.checked)
                  }
                  styles={{
                    label: { fontSize: "var(--mantine-font-size-xs)" },
                    input: { borderRadius: 0 },
                    inner: { borderRadius: 0 },
                    icon: { borderRadius: 0 },
                  }}
                />
              )}
            </Group>
            <Button
              variant="light"
              color="brand"
              size="sm"
              onClick={scrollToCurrentMonth}
            >
              Today
            </Button>
          </Group>
        </Box>
        <Box
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <table
            style={{
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: "100%",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    top: 0,
                    zIndex: 4,
                    minWidth: CATEGORY_COLUMN_MIN_PX,
                    width: CATEGORY_COLUMN_MIN_PX,
                    padding: "10px 12px",
                    textAlign: "left",
                    fontSize: "var(--mantine-font-size-sm)",
                    fontWeight: 600,
                    background: headerBg,
                    borderRight: border,
                    borderBottom: border,
                    boxShadow: "4px 0 8px rgba(0,0,0,0.04)",
                  }}
                >
                  Category
                </th>
                {months.map((ym) => {
                  const isCurrent =
                    ym.year === nowYm.year && ym.month === nowYm.month;
                  const isYearStart = ym.month === 1;
                  return (
                    <th
                      key={yearMonthKey(ym)}
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        minWidth: MONTH_COLUMN_PX,
                        width: MONTH_COLUMN_PX,
                        padding: "10px 8px",
                        textAlign: "right",
                        fontSize: "var(--mantine-font-size-xs)",
                        fontWeight: isCurrent ? 700 : 600,
                        color: isCurrent ? "var(--mantine-color-brand-7)" : undefined,
                        background: isCurrent
                          ? "var(--mantine-color-brand-0)"
                          : headerBg,
                        borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
                        borderRight: border,
                        borderBottom: border,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatYearMonthLabel(ym)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => {
                const root = segment.root;
                return (
                  <Fragment key={root.id}>
                    <tr>
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                          padding: "8px 12px",
                          fontSize: "var(--mantine-font-size-sm)",
                          fontWeight: 700,
                          background: segmentRowBg,
                          borderRight: border,
                          borderBottom: border,
                          boxShadow: "4px 0 8px rgba(0,0,0,0.04)",
                          maxWidth: CATEGORY_COLUMN_MIN_PX + 80,
                          overflow: "hidden",
                          verticalAlign: "middle",
                        }}
                        title={root.name}
                      >
                        <Group justify="space-between" wrap="nowrap" align="center" gap="xs">
                          <Text
                            fw={700}
                            size="sm"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            {root.name}
                          </Text>
                          <Badge
                            variant="outline"
                            size="sm"
                            color="gray"
                            style={{ flexShrink: 0 }}
                          >
                            {displayCategoryType(root.categoryType)}
                          </Badge>
                        </Group>
                      </td>
                      {months.map((ym) => {
                        const key = `${root.id}|${ym.year}|${ym.month}`;
                        const raw = budgetByKey.get(key);
                        const actualNum = actualsByYearMonth
                          .get(yearMonthKey(ym))
                          ?.get(root.id);
                        const cellNum = matrixCellNumber(
                          valueMode,
                          root.categoryType,
                          raw,
                          actualNum,
                        );
                        const isCurrent =
                          ym.year === nowYm.year && ym.month === nowYm.month;
                        const isYearStart = ym.month === 1;
                        const isEmpty = cellNum === undefined;
                        return (
                          <td
                            key={yearMonthKey(ym)}
                            style={{
                              padding: "8px 8px",
                              textAlign: "right",
                              fontSize: "var(--mantine-font-size-sm)",
                              lineHeight: MATRIX_VALUE_CELL_LINE_HEIGHT,
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 600,
                              borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
                              borderRight: border,
                              borderBottom: border,
                              background: isCurrent
                                ? "var(--mantine-color-brand-0)"
                                : segmentRowBg,
                              color:
                                valueMode !== "budgeted" && isEmpty
                                  ? "var(--mantine-color-dimmed)"
                                  : undefined,
                              verticalAlign: "middle",
                            }}
                          >
                            {valueMode === "budgeted" ? (
                              <BudgetCellInput
                                categoryId={root.id}
                                year={ym.year}
                                month={ym.month}
                                amountStr={raw}
                                overwriteFutureMonths={applyToFutureMonths}
                                fw={600}
                                compact
                              />
                            ) : isEmpty ? (
                              "—"
                            ) : (
                              formatMatrixValue(cellNum)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {segment.descendantRows.map(({ category: row, depth }) => (
                      <tr key={row.id}>
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 1,
                            padding: "8px 12px",
                            fontSize: "var(--mantine-font-size-sm)",
                            fontWeight: 400,
                            background: stickyBg,
                            borderRight: border,
                            borderBottom: border,
                            boxShadow: "4px 0 8px rgba(0,0,0,0.04)",
                            maxWidth: CATEGORY_COLUMN_MIN_PX + 80,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            verticalAlign: "middle",
                          }}
                          title={row.name}
                        >
                          <Box
                            style={{
                              paddingLeft: depth * 24,
                              borderLeft:
                                depth > 0
                                  ? "2px solid var(--mantine-color-brand-3)"
                                  : undefined,
                            }}
                          >
                            {row.name}
                          </Box>
                        </td>
                        {months.map((ym) => {
                          const key = `${row.id}|${ym.year}|${ym.month}`;
                          const raw = budgetByKey.get(key);
                          const actualNum = actualsByYearMonth
                            .get(yearMonthKey(ym))
                            ?.get(row.id);
                          const cellNum = matrixCellNumber(
                            valueMode,
                            row.categoryType,
                            raw,
                            actualNum,
                          );
                          const isCurrent =
                            ym.year === nowYm.year && ym.month === nowYm.month;
                          const isYearStart = ym.month === 1;
                          const isEmpty = cellNum === undefined;
                          return (
                            <td
                              key={yearMonthKey(ym)}
                              style={{
                                padding: "8px 8px",
                                textAlign: "right",
                                fontSize: "var(--mantine-font-size-sm)",
                                lineHeight: MATRIX_VALUE_CELL_LINE_HEIGHT,
                                fontVariantNumeric: "tabular-nums",
                                borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
                                borderRight: border,
                                borderBottom: border,
                                background: isCurrent
                                  ? "var(--mantine-color-brand-0)"
                                  : undefined,
                                color:
                                  valueMode !== "budgeted" && isEmpty
                                    ? "var(--mantine-color-dimmed)"
                                    : undefined,
                                verticalAlign: "middle",
                              }}
                            >
                              {valueMode === "budgeted" ? (
                                <BudgetCellInput
                                  categoryId={row.id}
                                  year={ym.year}
                                  month={ym.month}
                                  amountStr={raw}
                                  overwriteFutureMonths={applyToFutureMonths}
                                  compact
                                />
                              ) : isEmpty ? (
                                "—"
                              ) : (
                                formatMatrixValue(cellNum)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    padding: "8px 12px",
                    fontSize: "var(--mantine-font-size-sm)",
                    fontWeight: 700,
                    background: "var(--mantine-color-gray-0)",
                    borderRight: border,
                    borderTop: "2px solid var(--mantine-color-default-border)",
                    borderBottom: border,
                    boxShadow: "4px 0 8px rgba(0,0,0,0.04)",
                    verticalAlign: "middle",
                  }}
                >
                  Total
                </td>
                {months.map((ym) => {
                  const summary = monthSummaries.get(yearMonthKey(ym))!;
                  const total = totalForMode(summary, valueMode);
                  const isCurrent =
                    ym.year === nowYm.year && ym.month === nowYm.month;
                  const isYearStart = ym.month === 1;
                  return (
                    <td
                      key={yearMonthKey(ym)}
                      style={{
                        padding: "8px 8px",
                        textAlign: "right",
                        fontSize: "var(--mantine-font-size-sm)",
                        lineHeight: MATRIX_VALUE_CELL_LINE_HEIGHT,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
                        borderRight: border,
                        borderTop: "2px solid var(--mantine-color-default-border)",
                        borderBottom: border,
                        background: isCurrent
                          ? "var(--mantine-color-brand-0)"
                          : "var(--mantine-color-gray-0)",
                        verticalAlign: "middle",
                      }}
                    >
                      {formatMatrixValue(total)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </Box>
      </Paper>
    </Box>
  );
}
