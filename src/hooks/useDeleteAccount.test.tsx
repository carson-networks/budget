import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccountSchema,
  AccountType,
  ListAccountsResponseSchema,
  type ListAccountsResponse,
} from "../connectRPC/types.js";
import type { InfiniteData } from "@tanstack/react-query";
import { useDeleteAccount } from "./useAccounts.js";

const { deleteAccountMock } = vi.hoisted(() => ({
  deleteAccountMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  accountClient: {
    deleteAccount: deleteAccountMock,
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useDeleteAccount", () => {
  beforeEach(() => {
    deleteAccountMock.mockReset();
    deleteAccountMock.mockResolvedValue({});
  });

  it("calls deleteAccount and removes the account from the cache", async () => {
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

    await act(async () => {
      result.current.mutate("drop");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteAccountMock).toHaveBeenCalledWith({ id: "drop" });

    const cached = queryClient.getQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
    );
    expect(cached?.pages[0].accounts.map((a) => a.id)).toEqual(["keep"]);
  });

  it("rolls back the accounts cache when deleteAccount fails", async () => {
    deleteAccountMock.mockRejectedValue(new Error("boom"));
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const only = create(AccountSchema, {
      id: "only",
      name: "Only",
      type: AccountType.CASH,
      subType: "Checking",
      balance: "1",
      startingBalance: "1",
    });
    queryClient.setQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
      {
        pages: [
          create(ListAccountsResponseSchema, {
            accounts: [only],
            nextCursor: undefined,
          }),
        ],
        pageParams: [undefined],
      },
    );

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate("only");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
    );
    expect(cached?.pages[0].accounts.map((a) => a.id)).toEqual(["only"]);
  });
});
