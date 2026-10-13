import { Affix, ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

type FloatingCreateButtonProps = {
  ariaLabel: string;
  onClick: () => void;
};

export function FloatingCreateButton({
  ariaLabel,
  onClick,
}: FloatingCreateButtonProps) {
  return (
    <Affix position={{ bottom: 24, right: 24 }}>
      <ActionIcon
        size="xl"
        radius="xl"
        color="brand"
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <IconPlus size={24} />
      </ActionIcon>
    </Affix>
  );
}
