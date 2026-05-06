import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App.js";
import { MantineAppRoot } from "./MantineAppRoot.js";
import { useShellStore } from "./stores/shell/useShellStore.js";

describe("App routes", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
  });

  function renderApp(initialPath: string) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <MantineAppRoot>
          <MemoryRouter initialEntries={[initialPath]}>
            <App />
          </MemoryRouter>
        </MantineAppRoot>
      </QueryClientProvider>,
    );
  }

  it("serves the home page at / without redirecting", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { name: "Home", level: 2 }),
    ).toBeInTheDocument();
  });
});
