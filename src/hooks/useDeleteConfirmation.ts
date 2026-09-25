import { useCallback, useState } from "react";

export function useDeleteConfirmation() {
  const [armed, setArmed] = useState(false);

  const arm = useCallback(() => setArmed(true), []);
  const disarm = useCallback(() => setArmed(false), []);
  const reset = useCallback(() => setArmed(false), []);

  return { armed, arm, disarm, reset, setArmed };
}
