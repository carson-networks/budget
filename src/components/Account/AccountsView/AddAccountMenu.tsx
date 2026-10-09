import { Affix, Menu, ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

type AddAccountMenuProps = {
  onManualOpen: () => void;
  /** Fires when the + control is pressed (menu opening). Use to prefetch Plaid link token. */
  onAddAccountMenuOpen?: () => void;
  onConnectBankOpen?: () => void;
};

export function AddAccountMenu({
  onManualOpen,
  onAddAccountMenuOpen,
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
            onClick={() => onAddAccountMenuOpen?.()}
          >
            <IconPlus size={24} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={onManualOpen}>Add manual account</Menu.Item>
          <Menu.Item onClick={() => onConnectBankOpen?.()}>
            Connect bank (Plaid)
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Affix>
  );
}
