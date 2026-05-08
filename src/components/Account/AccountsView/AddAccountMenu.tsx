import { Affix, Menu, Text, ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

type AddAccountMenuProps = {
  onManualOpen: () => void;
  /** When false, Plaid connect is hidden (e.g. feature flag). Defaults to true. */
  connectBankAvailable?: boolean;
  onConnectBankOpen?: () => void;
};

export function AddAccountMenu({
  onManualOpen,
  connectBankAvailable = true,
  onConnectBankOpen,
}: AddAccountMenuProps) {
  return (
    <Affix position={{ bottom: 24, right: 24 }}>
      <Menu shadow="md" width={260} position="top-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            size="xl"
            radius="xl"
            color="brand"
            aria-label="Add account"
          >
            <IconPlus size={24} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={onManualOpen}>Add manual account</Menu.Item>
          <Menu.Item
            disabled={!connectBankAvailable}
            onClick={() => {
              if (connectBankAvailable) {
                onConnectBankOpen?.();
              }
            }}
          >
            Connect bank (Plaid)
            {!connectBankAvailable ? (
              <Text size="xs" c="dimmed" mt={4}>
                Coming soon
              </Text>
            ) : null}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Affix>
  );
}
