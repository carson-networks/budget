import { Button } from "@mantine/core";
import { IconFlag } from "@tabler/icons-react";

type NeedsReviewToggleProps = {
  active: boolean;
  onToggle: (active: boolean) => void;
};

export function NeedsReviewToggle({
  active,
  onToggle,
}: NeedsReviewToggleProps) {
  return (
    <Button
      variant={active ? "filled" : "default"}
      size="compact-md"
      leftSection={<IconFlag size={16} />}
      aria-pressed={active}
      onClick={() => onToggle(!active)}
    >
      Needs review
    </Button>
  );
}
