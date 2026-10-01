import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell/AppShell";
import AccountsView from "./components/Account/AccountsView/AccountsView";
import BudgetView from "./components/BudgetView/BudgetView";
import CategoriesView from "./components/Category/CategoriesView/CategoriesView";
import TransactionsView from "./components/TransactionsView/TransactionsView";
import { HomePage } from "./pages/HomePage";
import { SpikeFollowMonthsConfirmPage } from "./pages/SpikeFollowMonthsConfirmPage";
import {
  preferenceToRootColorSchemeProps,
  useShellStore,
} from "./stores/shell/useShellStore";
import { theme } from "./theme";

function App() {
  const colorSchemePreference = useShellStore((s) => s.colorSchemePreference);
  const colorProps = preferenceToRootColorSchemeProps(colorSchemePreference);

  return (
    <>
      <ColorSchemeScript {...colorProps} />
      <MantineProvider theme={theme} {...colorProps}>
        <Routes>
          <Route
            path="/spike/follow-months-confirm"
            element={<SpikeFollowMonthsConfirmPage />}
          />
          <Route path="/" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="budget" element={<BudgetView />} />
            <Route path="transactions" element={<TransactionsView />} />
            <Route path="accounts" element={<AccountsView />} />
            <Route
              path="accounts/:accountId"
              element={
                <p style={{ padding: "var(--mantine-spacing-md)" }}>
                  Account activity view ships in a later phase.
                </p>
              }
            />
            <Route path="categories" element={<CategoriesView />} />
          </Route>
        </Routes>
      </MantineProvider>
    </>
  );
}

export default App;
