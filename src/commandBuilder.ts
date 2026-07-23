export type ShellFamily = 'powershell' | 'cmd' | 'posix' | 'generic';

export function quoteShellArgument(value: string, shellFamily: ShellFamily): string {
  switch (shellFamily) {
    case 'powershell':
      return `'${value.replace(/'/g, "''")}'`;
    case 'cmd':
      return `"${value.replace(/"/g, '""')}"`;
    case 'posix':
      return `'${value.replace(/'/g, "'\\''")}'`;
    case 'generic':
      return `"${value.replace(/"/g, '\\"')}"`;
  }
}

export function buildTerminalCommand(
  command: string,
  resourcePath: string,
  isDirectory: boolean,
  shellFamily: ShellFamily,
): string {
  const trimmedCommand = command.trim();

  if (!trimmedCommand) {
    throw new Error('命令不能为空。');
  }

  if (isDirectory) {
    return trimmedCommand;
  }

  const quotedPath = quoteShellArgument(resourcePath, shellFamily);
  return trimmedCommand.includes('{resource}')
    ? trimmedCommand.replaceAll('{resource}', quotedPath)
    : `${trimmedCommand} ${quotedPath}`;
}

export function buildExternalTerminalArguments(
  command: string,
  shellFamily: ShellFamily,
): string[] {
  switch (shellFamily) {
    case 'powershell':
      return ['-NoExit', '-Command', command];
    case 'cmd':
      return ['/K', command];
    case 'posix':
    case 'generic':
      return ['-ic', command];
  }
}

export function buildWindowsStartArguments(
  shellPath: string,
  terminalArguments: readonly string[],
): string[] {
  return ['/d', '/c', 'start', '""', shellPath, ...terminalArguments];
}
