import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useConnectedAccountFlow } from "../hooks/useConnectedAccountFlow.js";

type PlaidAccountLinkContextValue = ReturnType<typeof useConnectedAccountFlow>;

const PlaidAccountLinkContext = createContext<
  PlaidAccountLinkContextValue | undefined
>(undefined);

/**
 * Mount once under the router so {@link usePlaidLink} runs a single time per app session.
 * Duplicated embedding breaks Plaid Link (and Strict Mode double-mount on AccountsView).
 */
export function PlaidAccountLinkProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const navigate = useNavigate();
  const flow = useConnectedAccountFlow(() => navigate("/accounts"));

  return (
    <PlaidAccountLinkContext.Provider value={flow}>
      {children}
    </PlaidAccountLinkContext.Provider>
  );
}

export function usePlaidAccountLink(): PlaidAccountLinkContextValue {
  const ctx = useContext(PlaidAccountLinkContext);
  if (ctx === undefined) {
    throw new Error(
      "usePlaidAccountLink must be used within PlaidAccountLinkProvider",
    );
  }
  return ctx;
}
