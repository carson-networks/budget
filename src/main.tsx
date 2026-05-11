import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mantine/core/styles.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "./index.css";
import App from "./App.tsx";
import { PlaidAccountLinkProvider } from "./plaid/PlaidAccountLinkProvider.js";

const queryClient = new QueryClient();

// No <StrictMode>: it double-mounts in dev and causes react-plaid-link / Plaid Link to warn about
// duplicate embedding (link-initialize.js). Production builds were already single-mount.

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <PlaidAccountLinkProvider>
        <App />
      </PlaidAccountLinkProvider>
    </BrowserRouter>
  </QueryClientProvider>,
);
