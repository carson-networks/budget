import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { theme } from "./theme";
import {
  preferenceToRootColorSchemeProps,
  useShellStore,
} from "./stores/shell/useShellStore";

type MantineAppRootProps = {
  children: ReactNode;
};

export function MantineAppRoot({ children }: MantineAppRootProps) {
  const colorSchemePreference = useShellStore((s) => s.colorSchemePreference);
  const colorProps = preferenceToRootColorSchemeProps(colorSchemePreference);

  return (
    <>
      <ColorSchemeScript {...colorProps} />
      <MantineProvider theme={theme} {...colorProps}>
        {children}
      </MantineProvider>
    </>
  );
}
