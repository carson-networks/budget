import { Alert, Text } from "@mantine/core";
import type { AccountSyncOptionMeta } from "../../constants/accountSyncIntegrations";

type IntegrationExplainerProps = {
  meta: AccountSyncOptionMeta | undefined;
  /** When true, this is a non-manual integration row. */
  show: boolean;
};

export function IntegrationExplainer({ meta, show }: IntegrationExplainerProps) {
  if (!show || !meta || meta.id === "manual") return null;
  if (!meta.description && !meta.selectedHelp) return null;

  return (
    <Alert color="gray" variant="light">
      <Text size="sm" fw={500} mb={4}>
        {meta.label}
      </Text>
      {meta.description ? (
        <Text size="sm" c="dimmed">
          {meta.description}
        </Text>
      ) : null}
      {meta.selectedHelp ? (
        <Text size="sm" mt={meta.description ? "sm" : 0}>
          {meta.selectedHelp}
        </Text>
      ) : null}
    </Alert>
  );
}
