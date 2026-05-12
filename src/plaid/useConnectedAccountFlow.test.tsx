import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const linkOpen = vi.fn();
  const mutate = vi.fn();
  const resetExchange = vi.fn();
  const fetchLinkToken = vi.fn().mockResolvedValue("link-token-test");
  const exchangeState = {
    isError: false,
    error: null as Error | null,
  };
  let plaidOnSuccess: ((publicToken: string, metadata: unknown) => void) | null =
    null;
  let plaidOnExit: (() => void) | null = null;

  return {
    linkOpen,
    mutate,
    resetExchange,
    fetchLinkToken,
    exchangeState,
    get plaidOnSuccess() {
      return plaidOnSuccess;
    },
    setPlaidHandlers(
      onSuccess: (publicToken: string, metadata: unknown) => void,
      onExit: () => void,
    ) {
      plaidOnSuccess = onSuccess;
      plaidOnExit = onExit;
    },
    get plaidOnExit() {
      return plaidOnExit;
    },
  };
});

vi.mock("react-plaid-link", () => ({
  usePlaidLink: (opts: {
    onSuccess: (publicToken: string, metadata: unknown) => void;
    onExit: () => void;
  }) => {
    hoisted.setPlaidHandlers(opts.onSuccess, opts.onExit);
    return {
      open: hoisted.linkOpen,
      ready: true,
      exit: vi.fn(),
      error: null,
    };
  },
}));

vi.mock("./useExchangePlaidToken.js", () => ({
  useExchangePlaidToken: () => ({
    mutate: hoisted.mutate,
    reset: hoisted.resetExchange,
    get isError() {
      return hoisted.exchangeState.isError;
    },
    get error() {
      return hoisted.exchangeState.error;
    },
    isPending: false,
  }),
}));

vi.mock("./usePlaidLinkToken.js", () => {
  const plaidLinkTokenQueryKey = ["plaidLinkToken"] as const;
  return {
    plaidLinkTokenQueryKey,
    plaidLinkTokenQueryOptions: () => ({
      queryKey: plaidLinkTokenQueryKey,
      queryFn: hoisted.fetchLinkToken,
    }),
    fetchPlaidLinkToken: vi.fn(),
    prefetchPlaidLinkToken: vi.fn(),
  };
});

import { useConnectedAccountFlow } from "./useConnectedAccountFlow.js";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useConnectedAccountFlow", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.exchangeState.isError = false;
    hoisted.exchangeState.error = null;
    hoisted.fetchLinkToken.mockReset();
    hoisted.fetchLinkToken.mockResolvedValue("link-token-test");
    hoisted.mutate.mockImplementation(
      (_input: unknown, opts?: { onSuccess?: () => void }) => {
        opts?.onSuccess?.();
      },
    );
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("startLink fetches a link token and opens Plaid Link when ready", async () => {
    const { result } = renderHook(
      () => useConnectedAccountFlow(vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.startLink();
    });

    await waitFor(() => {
      expect(hoisted.linkOpen).toHaveBeenCalled();
    });
    expect(hoisted.fetchLinkToken).toHaveBeenCalled();
  });

  it("sets tokenError when link token fetch fails", async () => {
    hoisted.fetchLinkToken.mockRejectedValueOnce(new Error("token denied"));

    const { result } = renderHook(
      () => useConnectedAccountFlow(vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.startLink();
    });

    expect(result.current.tokenError).toBe("token denied");
  });

  it("clears tokenError when dismissTokenError is called", async () => {
    hoisted.fetchLinkToken.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(
      () => useConnectedAccountFlow(vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.startLink();
    });
    expect(result.current.tokenError).toBe("offline");

    act(() => {
      result.current.dismissTokenError();
    });
    expect(result.current.tokenError).toBeNull();
  });

  it("runs exchange + success side effects when Plaid succeeds", async () => {
    const onExchangeSuccess = vi.fn();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useConnectedAccountFlow(onExchangeSuccess),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.startLink();
    });

    await waitFor(() => {
      expect(hoisted.plaidOnSuccess).not.toBeNull();
    });

    await act(async () => {
      hoisted.plaidOnSuccess!("public-tok", {
        institution: { institution_id: "ins_1", name: "Bank" },
        accounts: [
          {
            id: "acc-1",
            name: "Checking",
            mask: "",
            type: "depository",
            subtype: "checking",
            verification_status: "",
          },
        ],
        link_session_id: "sess",
      });
    });

    expect(hoisted.mutate).toHaveBeenCalled();
    const firstArg = hoisted.mutate.mock.calls[0][0] as {
      publicToken: string;
    };
    expect(firstArg.publicToken).toBe("public-tok");
    expect(onExchangeSuccess).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["plaidLinkToken"],
    });
  });

  it("exposes exchangeError when the exchange mutation failed", () => {
    hoisted.exchangeState.isError = true;
    hoisted.exchangeState.error = new Error("exchange failed");

    const { result } = renderHook(
      () => useConnectedAccountFlow(vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.exchangeError).toBe("exchange failed");
  });

  it("calls reset on the exchange mutation when dismissExchangeError runs", () => {
    hoisted.exchangeState.isError = true;
    hoisted.exchangeState.error = new Error("bad");

    const { result } = renderHook(
      () => useConnectedAccountFlow(vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    act(() => {
      result.current.dismissExchangeError();
    });

    expect(hoisted.resetExchange).toHaveBeenCalled();
  });
});
