import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import BudgetView from "./views/BudgetView";
import TransactionsView from "./views/TransactionsView";
import AccountsView from "./views/AccountsView";
import CategoriesView from "./views/CategoriesView";

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
