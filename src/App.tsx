import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell/AppShell";
import AccountsView from "./components/Account/AccountsView/AccountsView";
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
            <Route path="budget" element={null} />
            <Route path="transactions" element={null} />
            <Route path="accounts" element={<AccountsView />} />
            <Route
              path="accounts/:accountId"
              element={
                <p style={{ padding: "var(--mantine-spacing-md)" }}>
                  Account activity view ships in a later phase.
                </p>
              }
            />
            <Route path="categories" element={null} />
          </Route>
        </Routes>
      </MantineProvider>
    </>
  );
}

export default App;
