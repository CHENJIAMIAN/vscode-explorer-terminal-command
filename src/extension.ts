import { execFile, spawn } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import {
  buildExternalTerminalArguments,
  buildTerminalCommand,
  buildWindowsStartArguments,
  type ShellFamily,
} from './commandBuilder';

const COMMAND_ID = 'explorerTerminalCommand.run';
const CONFIGURATION_SECTION = 'explorerTerminalCommand';
const execFileAsync = promisify(execFile);

type TerminalPreference = 'auto' | 'pwsh' | 'powershell' | 'cmd' | 'bash' | 'custom';

interface ShellResolution {
  readonly shellPath: string;
  readonly shellFamily: ShellFamily;
}

const terminalPreferences: readonly TerminalPreference[] = [
  'auto',
  'pwsh',
  'powershell',
  'cmd',
  'bash',
  'custom',
];

const executableCache = new Map<string, Promise<string | undefined>>();

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, async (...args: unknown[]) => {
      await runExplorerTerminalCommand(args);
    }),
  );
}

async function runExplorerTerminalCommand(args: readonly unknown[]): Promise<void> {
  const resources = getResourcesFromCommandArguments(args);

  if (resources.length !== 1) {
    void vscode.window.showWarningMessage('请在资源管理器中只选择一个文件或文件夹后再运行此命令。');
    return;
  }

  const resource = resources[0];
  let fileType: vscode.FileType;

  try {
    fileType = (await vscode.workspace.fs.stat(resource)).type;
  } catch {
    void vscode.window.showErrorMessage('无法读取所选资源，未执行终端命令。');
    return;
  }

  const isDirectory = (fileType & vscode.FileType.Directory) !== 0;
  const isFile = (fileType & vscode.FileType.File) !== 0;

  if (!isDirectory && !isFile) {
    void vscode.window.showWarningMessage('此命令仅支持文件或文件夹。');
    return;
  }

  if (resource.scheme !== 'file') {
    void vscode.window.showWarningMessage('外部终端仅支持本地文件或文件夹。');
    return;
  }

  const resourceName = getResourceName(resource);
  const command = await vscode.window.showInputBox({
    title: '在终端中执行命令',
    prompt: isDirectory
      ? `命令将在“${resourceName}”目录中执行。`
      : `命令会自动追加“${resourceName}”的路径。`,
    placeHolder: isDirectory ? '例如：codex' : '例如：cat',
    ignoreFocusOut: true,
    validateInput: validateCommandInput,
  });

  if (command === undefined) {
    return;
  }

  try {
    const shell = await resolveShell();
    const resourcePath = resource.fsPath;
    const terminalCommand = buildTerminalCommand(command, resourcePath, isDirectory, shell.shellFamily);
    await launchExternalTerminal(shell, terminalCommand, getWorkingDirectory(resource, isDirectory));
  } catch (error) {
    void vscode.window.showErrorMessage(`无法启动外部终端：${getErrorMessage(error)}`);
  }
}

function validateCommandInput(value: string): string | undefined {
  if (!value.trim()) {
    return '请输入命令。';
  }

  if (/\r|\n/.test(value)) {
    return '请输入单行命令。';
  }

  return undefined;
}

function getResourcesFromCommandArguments(args: readonly unknown[]): vscode.Uri[] {
  const arrayArguments = args.filter(Array.isArray).flat().filter(isUri);
  const directArguments = args.filter(isUri);
  const candidates = arrayArguments.length > 0 ? arrayArguments : directArguments;
  const uniqueResources = new Map<string, vscode.Uri>();

  for (const resource of candidates) {
    uniqueResources.set(resource.toString(), resource);
  }

  return [...uniqueResources.values()];
}

function isUri(value: unknown): value is vscode.Uri {
  return value instanceof vscode.Uri;
}

function getParentUri(resource: vscode.Uri): vscode.Uri {
  if (resource.scheme === 'file') {
    return vscode.Uri.file(path.dirname(resource.fsPath));
  }

  const separatorIndex = resource.path.lastIndexOf('/');
  const parentPath = separatorIndex > 0 ? resource.path.slice(0, separatorIndex) : '/';
  return resource.with({ path: parentPath });
}

function getWorkingDirectory(resource: vscode.Uri, isDirectory: boolean): string {
  return (isDirectory ? resource : getParentUri(resource)).fsPath;
}

function getResourceName(resource: vscode.Uri): string {
  return resource.path.split('/').filter(Boolean).at(-1) ?? resource.fsPath;
}

async function resolveShell(): Promise<ShellResolution> {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
  const preference = getTerminalPreference(configuration.get<string>('terminal', 'auto'));

  if (preference === 'custom') {
    const customShellPath = configuration.get<string>('customShellPath', '').trim();
    if (!customShellPath) {
      throw new Error('请先设置 explorerTerminalCommand.customShellPath。');
    }

    return {
      shellPath: customShellPath,
      shellFamily: getShellFamily(configuration.get<string>('customShellFamily', 'powershell')),
    };
  }

  if (preference === 'auto') {
    const pwsh = await findExecutable(process.platform === 'win32' ? 'pwsh.exe' : 'pwsh');
    if (pwsh) {
      return { shellPath: pwsh, shellFamily: 'powershell' };
    }

    if (process.platform === 'win32') {
      const windowsPowerShell = await findExecutable('powershell.exe');
      if (windowsPowerShell) {
        return { shellPath: windowsPowerShell, shellFamily: 'powershell' };
      }

      return { shellPath: process.env.ComSpec ?? 'cmd.exe', shellFamily: 'cmd' };
    }

    const posixShell = process.env.SHELL ?? await findExecutable('bash') ?? await findExecutable('sh');
    if (!posixShell) {
      throw new Error('未找到可用的外部终端程序。');
    }

    return { shellPath: posixShell, shellFamily: 'posix' };
  }

  const executableName = getExecutableName(preference);
  const shellPath = await findExecutable(executableName);
  if (!shellPath) {
    throw new Error(`未找到终端程序：${executableName}`);
  }

  return {
    shellPath,
    shellFamily: preference === 'cmd' ? 'cmd' : preference === 'bash' ? 'posix' : 'powershell',
  };
}

async function launchExternalTerminal(
  shell: ShellResolution,
  terminalCommand: string,
  cwd: string,
): Promise<void> {
  const terminalArguments = buildExternalTerminalArguments(terminalCommand, shell.shellFamily);

  if (process.platform === 'win32') {
    const commandProcessor = process.env.ComSpec ?? await findExecutable('cmd.exe');
    if (!commandProcessor) {
      throw new Error('未找到 Windows 命令处理程序 cmd.exe。');
    }

    await startDetachedProcess(
      commandProcessor,
      buildWindowsStartArguments(shell.shellPath, terminalArguments),
      cwd,
    );
  } else {
    await startDetachedProcess(shell.shellPath, terminalArguments, cwd);
  }

  void vscode.window.showInformationMessage('已在外部终端窗口中启动命令。');
}

function startDetachedProcess(executable: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(executable, args, {
      cwd,
      detached: true,
      shell: false,
      stdio: 'ignore',
      windowsHide: false,
    });
    const onError = (error: Error) => reject(error);
    const onSpawn = () => {
      childProcess.off('error', onError);
      childProcess.unref();
      resolve();
    };

    childProcess.once('error', onError);
    childProcess.once('spawn', onSpawn);
  });
}

function getTerminalPreference(value: string): TerminalPreference {
  return terminalPreferences.includes(value as TerminalPreference)
    ? (value as TerminalPreference)
    : 'auto';
}

function getShellFamily(value: string): ShellFamily {
  return value === 'cmd' || value === 'posix' || value === 'powershell' ? value : 'powershell';
}

function getExecutableName(preference: Exclude<TerminalPreference, 'auto' | 'custom'>): string {
  const windows = process.platform === 'win32';

  switch (preference) {
    case 'pwsh':
      return windows ? 'pwsh.exe' : 'pwsh';
    case 'powershell':
      return windows ? 'powershell.exe' : 'pwsh';
    case 'cmd':
      return 'cmd.exe';
    case 'bash':
      return windows ? 'bash.exe' : 'bash';
  }
}

function findExecutable(executableName: string): Promise<string | undefined> {
  const cacheKey = `${process.platform}:${executableName.toLowerCase()}`;
  let pendingResult = executableCache.get(cacheKey);

  if (!pendingResult) {
    pendingResult = locateExecutable(executableName);
    executableCache.set(cacheKey, pendingResult);
  }

  return pendingResult;
}

async function locateExecutable(executableName: string): Promise<string | undefined> {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';

  try {
    const { stdout } = await execFileAsync(locator, [executableName], { windowsHide: true });
    return stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  } catch {
    return undefined;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function deactivate(): void {
  // VS Code disposes command registrations through the extension context.
}
