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
import { useUpdateAccount } from "./useAccounts.js";

const { updateAccountMock } = vi.hoisted(() => ({
  updateAccountMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  accountClient: {
    updateAccount: updateAccountMock,
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useUpdateAccount", () => {
  beforeEach(() => {
    updateAccountMock.mockReset();
    updateAccountMock.mockResolvedValue({});
  });

  it("calls updateAccount and patches cache with starting-balance delta", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    const existing = create(AccountSchema, {
      id: "acc-1",
      name: "Old",
      type: AccountType.CASH,
      subType: "Checking",
      balance: "100.00",
      startingBalance: "50.00",
    });
    queryClient.setQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
      {
        pages: [
          create(ListAccountsResponseSchema, {
            accounts: [existing],
            nextCursor: undefined,
          }),
        ],
        pageParams: [undefined],
      },
    );

    const { result } = renderHook(() => useUpdateAccount(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({
        id: "acc-1",
        name: "New",
        subType: "Savings",
        startingBalance: "75.00",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateAccountMock).toHaveBeenCalledWith({
      id: "acc-1",
      name: "New",
      subType: "Savings",
      startingBalance: "75.00",
    });

    const cached = queryClient.getQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
    );
    const updated = cached?.pages[0].accounts[0];
    expect(updated?.name).toBe("New");
    expect(updated?.subType).toBe("Savings");
    expect(updated?.startingBalance).toBe("75.00");
    expect(updated?.balance).toBe("125.00");
  });

  it("rolls back the accounts cache when updateAccount fails", async () => {
    updateAccountMock.mockRejectedValue(new Error("boom"));
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    const existing = create(AccountSchema, {
      id: "acc-1",
      name: "Old",
      type: AccountType.CASH,
      subType: "Checking",
      balance: "100.00",
      startingBalance: "50.00",
    });
    queryClient.setQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
      {
        pages: [
          create(ListAccountsResponseSchema, {
            accounts: [existing],
            nextCursor: undefined,
          }),
        ],
        pageParams: [undefined],
      },
    );

    const { result } = renderHook(() => useUpdateAccount(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({
        id: "acc-1",
        name: "New",
        subType: "Savings",
        startingBalance: "75.00",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<InfiniteData<ListAccountsResponse>>(
      ["accounts"],
    );
    const restored = cached?.pages[0].accounts[0];
    expect(restored?.name).toBe("Old");
    expect(restored?.subType).toBe("Checking");
    expect(restored?.startingBalance).toBe("50.00");
    expect(restored?.balance).toBe("100.00");
  });
});
