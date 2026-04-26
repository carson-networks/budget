import { Fragment } from "react";
import { Box, Group, Text, Badge } from "@mantine/core";
import { yearMonthKey, type YearMonth } from "../../../utils/monthRange";
import type { CategorySegment } from "../../../utils/categorySegments";
import {
  CATEGORY_COLUMN_MIN_PX,
  displayMatrixCategoryType,
  type MatrixValueMode,
} from "../budgetMatrix";
import { MatrixDataCell } from "./MatrixDataCell";

type MatrixSegmentBodyProps = {
  segments: CategorySegment[];
  months: YearMonth[];
  nowYm: YearMonth;
  valueMode: MatrixValueMode;
  applyToFutureMonths: boolean;
  effectiveBudgetByKey: Map<string, string>;
  actualsByYearMonth: Map<string, Map<string, number>>;
  stickyBg: string;
  segmentRowBg: string;
  border: string;
};

export function MatrixSegmentBody({
  segments,
  months,
  nowYm,
  valueMode,
  applyToFutureMonths,
  effectiveBudgetByKey,
  actualsByYearMonth,
  stickyBg,
  segmentRowBg,
  border,
}: MatrixSegmentBodyProps) {
  return (
    <>
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
                    {displayMatrixCategoryType(root.categoryType)}
                  </Badge>
                </Group>
              </td>
              {months.map((ym) => {
                const key = `${root.id}|${ym.year}|${ym.month}`;
                const raw = effectiveBudgetByKey.get(key);
                const actualNum = actualsByYearMonth
                  .get(yearMonthKey(ym))
                  ?.get(root.id);
                return (
                  <MatrixDataCell
                    key={yearMonthKey(ym)}
                    ym={ym}
                    nowYm={nowYm}
                    categoryId={root.id}
                    categoryType={root.categoryType}
                    valueMode={valueMode}
                    budgetRaw={raw}
                    actualNum={actualNum}
                    applyToFutureMonths={applyToFutureMonths}
                    fw={600}
                    compact
                    border={border}
                    nonCurrentBackground={segmentRowBg}
                  />
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
                  const raw = effectiveBudgetByKey.get(key);
                  const actualNum = actualsByYearMonth
                    .get(yearMonthKey(ym))
                    ?.get(row.id);
                  return (
                    <MatrixDataCell
                      key={yearMonthKey(ym)}
                      ym={ym}
                      nowYm={nowYm}
                      categoryId={row.id}
                      categoryType={row.categoryType}
                      valueMode={valueMode}
                      budgetRaw={raw}
                      actualNum={actualNum}
                      applyToFutureMonths={applyToFutureMonths}
                      compact
                      border={border}
                    />
                  );
                })}
              </tr>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}
