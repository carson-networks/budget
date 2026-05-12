import type {
  GetTransactionTotalsResponse as WireGetTxnTotalsResponse,
  Transaction as WireTransaction,
  TransactionTotalsCategory as WireTxnTotalsCat,
  TransactionTotalsMonth as WireTxnTotalsMonth,
} from "../connectRPC/types";
import { optionalDateFromTimestamp } from "./timestamp.js";

export type Transaction = {
  id: string;
  accountId: string;
  categoryId?: string;
  amount: string;
  transactionName: string;
  transactionDate?: Date;
  createdAt?: Date;
};

export type TransactionTotalsCategory = {
  categoryId: string;
  total: string;
};

export type TransactionTotalsMonth = {
  year: number;
  month: number;
  byCategory: TransactionTotalsCategory[];
};

export type TransactionTotalsByMonth = {
  byMonth: TransactionTotalsMonth[];
};

export type TransactionRange = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

export type CreateTransactionInput = {
  accountId: string;
  categoryId: string;
  amount: string;
  transactionName: string;
  transactionDate?: Date;
};

export function mapTransaction(wire: WireTransaction): Transaction {
  return {
    id: wire.id,
    accountId: wire.accountId,
    categoryId: wire.categoryId,
    amount: wire.amount,
    transactionName: wire.transactionName,
    transactionDate: optionalDateFromTimestamp(wire.transactionDate),
    createdAt: optionalDateFromTimestamp(wire.createdAt),
  };
}

export function mapTransactionTotalsCategory(
  wire: WireTxnTotalsCat,
): TransactionTotalsCategory {
  return {
    categoryId: wire.categoryId,
    total: wire.total,
  };
}

export function mapTransactionTotalsMonth(
  wire: WireTxnTotalsMonth,
): TransactionTotalsMonth {
  return {
    year: wire.year,
    month: wire.month,
    byCategory: wire.byCategory.map(mapTransactionTotalsCategory),
  };
}

export function mapGetTransactionTotalsResponse(
  wire: WireGetTxnTotalsResponse,
): TransactionTotalsByMonth {
  return {
    byMonth: wire.byMonth.map(mapTransactionTotalsMonth),
  };
}
