import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell/AppShell";
import AccountsView from "./components/Account/AccountsView/AccountsView";
import AccountTransactionsView from "./components/Account/AccountTransactionsView/AccountTransactionsView";
import BudgetCategoryTransactionsView from "./components/BudgetView/BudgetMonthView/BudgetCategoryTransactionsView";
import BudgetView from "./components/BudgetView/BudgetView";
import CategoriesView from "./components/Category/CategoriesView/CategoriesView";
import TransactionsView from "./components/TransactionsView/TransactionsView";
import { HomePage } from "./pages/HomePage";
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
          <Route path="/" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="budget" element={<BudgetView />} />
            <Route
              path="budget/categories/:categoryId"
              element={<BudgetCategoryTransactionsView />}
            />
            <Route path="transactions" element={<TransactionsView />} />
            <Route path="accounts" element={<AccountsView />} />
            <Route
              path="accounts/:accountId"
              element={<AccountTransactionsView />}
            />
            <Route path="categories" element={<CategoriesView />} />
          </Route>
        </Routes>
      </MantineProvider>
    </>
  );
}

export default App;
