import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell/AppShell";
import { HomePage } from "./pages/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="budget" element={null} />
        <Route path="transactions" element={null} />
        <Route path="accounts" element={null} />
        <Route path="categories" element={null} />
      </Route>
    </Routes>
  );
}

export default App;
