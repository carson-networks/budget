import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../theme.js";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders `ui` inside Mantine, a fresh QueryClient and a MemoryRouter. Mock the
 * ConnectRPC clients (`connectRPC/connect.js`) to control server data.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    route = "/",
  }: { queryClient?: QueryClient; route?: string } = {},
) {
  const wrap = (children: ReactNode) => (
    <MantineProvider theme={theme} env="test">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
  const result = render(wrap(ui));
  return {
    ...result,
    queryClient,
    rerender: (next: ReactElement) => result.rerender(wrap(next)),
  };
}

/** `renderHook` wrapper providing a QueryClient (and router) without Mantine. */
export function createWrapper(
  queryClient: QueryClient,
  { route = "/" }: { route?: string } = {},
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}
