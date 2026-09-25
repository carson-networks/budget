import { create } from "@bufbuild/protobuf";
import type { InfiniteData } from "@tanstack/react-query";
import type { Account as WireAccount } from "../connectRPC/types.js";
import {
  ListAccountsResponseSchema,
  type ListAccountsResponse,
} from "../connectRPC/types.js";

export function prependToInfiniteList(
  old: InfiniteData<ListAccountsResponse> | undefined,
  item: WireAccount,
): InfiniteData<ListAccountsResponse> {
  if (!old?.pages.length) {
    return {
      pages: [
        create(ListAccountsResponseSchema, {
          accounts: [item],
          nextCursor: undefined,
        }),
      ],
      pageParams: [undefined],
    };
  }
  const [first, ...rest] = old.pages;
  return {
    ...old,
    pages: [
      create(ListAccountsResponseSchema, {
        accounts: [item, ...(first.accounts ?? [])],
        nextCursor: first.nextCursor,
      }),
      ...rest,
    ],
  };
}

export function removeFromInfiniteList(
  old: InfiniteData<ListAccountsResponse> | undefined,
  predicate: (a: WireAccount) => boolean,
): InfiniteData<ListAccountsResponse> | undefined {
  if (!old?.pages.length) {
    return old;
  }
  return {
    ...old,
    pages: old.pages.map((page) =>
      create(ListAccountsResponseSchema, {
        accounts: (page.accounts ?? []).filter((a) => !predicate(a)),
        nextCursor: page.nextCursor,
      }),
    ),
  };
}

export function updateInInfiniteList(
  old: InfiniteData<ListAccountsResponse> | undefined,
  predicate: (a: WireAccount) => boolean,
  next: WireAccount,
): InfiniteData<ListAccountsResponse> | undefined {
  if (!old?.pages.length) {
    return old;
  }
  return {
    ...old,
    pages: old.pages.map((page) =>
      create(ListAccountsResponseSchema, {
        accounts: (page.accounts ?? []).map((a) => (predicate(a) ? next : a)),
        nextCursor: page.nextCursor,
      }),
    ),
  };
}
