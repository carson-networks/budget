import { create } from "@bufbuild/protobuf";
import {
  useInfiniteQuery,
  useMutation,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccountSchema,
  AccountType,
  ListAccountsResponseSchema,
} from "../connectRPC/types.js";
import { AccountIntegration, AccountKind } from "../models";
import {
  createTestQueryClient,
  createWrapper,
} from "../test/renderWithProviders.js";
import { accountMutations, accountQueries } from "./accounts.js";
import { transactionQueries } from "./transactions.js";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock("../connectRPC/connect.js", () => ({ accountClient: api }));

const wireAccount = (id: string, name: string) =>
  create(AccountSchema, {
    id,
    name,
    type: AccountType.CASH,
    subType: "Checking",
    balance: "10.00",
    startingBalance: "5.00",
  });

describe("accountQueries.list", () => {
  beforeEach(() => vi.resetAllMocks());

  it("pages through the API and flattens to mapped domain accounts", async () => {
    api.listAccounts
      .mockResolvedValueOnce(
        create(ListAccountsResponseSchema, {
          accounts: [wireAccount("a", "Alpha")],
          nextCursor: { position: 1, limit: 50 },
        }),
      )
      .mockResolvedValueOnce(
        create(ListAccountsResponseSchema, {
          accounts: [wireAccount("b", "Beta")],
        }),
      );
    const { result } = renderHook(
      () => useInfiniteQuery(accountQueries.list()),
      { wrapper: createWrapper(createTestQueryClient()) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listAccounts).toHaveBeenLastCalledWith({
      cursor: { position: 0, limit: 50 },
    });
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    expect(api.listAccounts).toHaveBeenLastCalledWith({
      cursor: expect.objectContaining({ position: 1, limit: 50 }),
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data).toEqual([
      expect.objectContaining({
        id: "a",
        name: "Alpha",
        accountKind: AccountKind.Cash,
        integration: AccountIntegration.Manual,
      }),
      expect.objectContaining({ id: "b", name: "Beta" }),
    ]);
  });

  it("surfaces RPC failures as Error", async () => {
    api.listAccounts.mockRejectedValue(new Error("down"));
    const { result } = renderHook(
      () => useInfiniteQuery(accountQueries.list()),
      { wrapper: createWrapper(createTestQueryClient()) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("down");
  });
});

describe("accountMutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.createAccount.mockResolvedValue({});
    api.updateAccount.mockResolvedValue({});
    api.deleteAccount.mockResolvedValue({});
  });

  function setup<T>(useHook: () => T) {
    const client = createTestQueryClient();
    client.setQueryData(accountQueries.list().queryKey, {
      pages: [create(ListAccountsResponseSchema, {})],
      pageParams: [undefined],
    });
    client.setQueryData(transactionQueries.lists(), {});
    const { result } = renderHook(useHook, {
      wrapper: createWrapper(client),
    });
    return { client, result };
  }

  it("createManual sends the fields and refetches accounts", async () => {
    const { client, result } = setup(() => useMutation(accountMutations.createManual));
    await act(() =>
      result.current.mutateAsync({
        name: "Cash",
        type: AccountType.CASH,
        subType: "Wallet",
        startingBalance: "1.00",
      }),
    );
    expect(api.createAccount).toHaveBeenCalledExactlyOnceWith({
      name: "Cash",
      type: AccountType.CASH,
      subType: "Wallet",
      startingBalance: "1.00",
    });
    expect(
      client.getQueryState(accountQueries.list().queryKey)?.isInvalidated,
    ).toBe(true);
  });

  it("update sends the fields and refetches accounts", async () => {
    const { client, result } = setup(() => useMutation(accountMutations.update));
    await act(() =>
      result.current.mutateAsync({
        id: "acc-1",
        name: "New",
        subType: "Savings",
        startingBalance: "75.00",
      }),
    );
    expect(api.updateAccount).toHaveBeenCalledExactlyOnceWith({
      id: "acc-1",
      name: "New",
      subType: "Savings",
      startingBalance: "75.00",
    });
    expect(
      client.getQueryState(accountQueries.list().queryKey)?.isInvalidated,
    ).toBe(true);
  });

  it("delete refetches accounts and the transactions it cascades", async () => {
    const { client, result } = setup(() => useMutation(accountMutations.delete));
    await act(() => result.current.mutateAsync("acc-1"));
    expect(api.deleteAccount).toHaveBeenCalledExactlyOnceWith({ id: "acc-1" });
    expect(
      client.getQueryState(accountQueries.list().queryKey)?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(transactionQueries.lists())?.isInvalidated,
    ).toBe(true);
  });

  it("refetches even when the mutation fails, and surfaces the error", async () => {
    api.updateAccount.mockRejectedValue(new Error("update failed"));
    const { client, result } = setup(() => useMutation(accountMutations.update));
    await expect(
      act(() =>
        result.current.mutateAsync({
          id: "acc-1",
          name: "x",
          subType: "y",
          startingBalance: "0",
        }),
      ),
    ).rejects.toThrow("update failed");
    expect(
      client.getQueryState(accountQueries.list().queryKey)?.isInvalidated,
    ).toBe(true);
  });
});
