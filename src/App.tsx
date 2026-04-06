import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import TransactionsView from "./views/TransactionsView";
import AccountsView from "./views/AccountsView";
import CategoriesView from "./views/CategoriesView";
import BudgetView from "./views/BudgetView";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/transactions" replace />} />
        <Route path="transactions" element={<TransactionsView />} />
        <Route path="accounts" element={<AccountsView />} />
        <Route path="categories" element={<CategoriesView />} />
        <Route path="budget" element={<BudgetView />} />
      </Route>
    </Routes>
  );
}

export default App;
