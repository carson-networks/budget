/** `id → name` lookup for rendering references (account/category labels). */
export function nameById(
  items: readonly { id: string; name: string }[],
): Map<string, string> {
  return new Map(items.map(({ id, name }) => [id, name]));
}
