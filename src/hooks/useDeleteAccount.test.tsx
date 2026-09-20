import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  AccountSchema,
  AccountType,
  ListAccountsResponseSchema,
  type ListAccountsResponse,
} from "../connectRPC/types.js";
import type { InfiniteData } from "@tanstack/react-query";
import { useDeleteAccount } from "./useAccounts.js";

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useDeleteAccount", () => {
  it("removes the account from the accounts query cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const keep = create(AccountSchema, {
      id: "keep",
      name: "Keep",
      type: AccountType.CASH,
      subType: "Checking",
      balance: "1",
      startingBalance: "1",
    });
    const drop = create(AccountSchema, {
      id: "drop",
      name: "Drop",
      type: AccountType.CASH,
      subType: "Savings",
      balance: "2",
      startingBalance: "2",
    });
    queryClient.setQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
      {
        pages: [
          create(ListAccountsResponseSchema, {
            accounts: [keep, drop],
            nextCursor: undefined,
          }),
        ],
        pageParams: [undefined],
      },
    );

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: wrapper(queryClient),
    });

    result.current.mutate("drop");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
    );
    expect(cached?.pages[0].accounts.map((a) => a.id)).toEqual(["keep"]);
  });
});
