export const COMMAND_HISTORY_KEY = 'commandHistory';
export const MAX_COMMAND_HISTORY_ITEMS = 20;

/** Returns a de-duplicated, most-recent-first command history. */
export function addCommandToHistory(
  history: readonly string[],
  command: string,
  maxItems = MAX_COMMAND_HISTORY_ITEMS,
): string[] {
  const normalizedCommand = command.trim();
  if (!normalizedCommand || maxItems <= 0) {
    return [...history];
  }

  return [
    normalizedCommand,
    ...history.filter((item) => item !== normalizedCommand),
  ].slice(0, maxItems);
}

export function getCommandHistory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}
