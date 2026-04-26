import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import BudgetView from "./components/BudgetView/BudgetView";
import TransactionsView from "./components/TransactionsView/View";
import AccountsView from "./components/AccountsView/AccountView";
import CategoriesView from "./components/CategoriesView/View";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/budget" replace />} />
        <Route path="budget" element={<BudgetView />} />
        <Route path="transactions" element={<TransactionsView />} />
        <Route path="accounts" element={<AccountsView />} />
        <Route path="categories" element={<CategoriesView />} />
      </Route>
    </Routes>
  );
}

export default App;
