[中文](./README.md)

# Explorer Terminal Command

<!-- codex-github-rules:bilingual-summary -->
> **中文简介**：从 VS Code 资源管理器在外部终端执行自定义命令

> **English summary**: Run custom commands in an external terminal from VS Code Explorer

---

Right-click one file or one folder in the VS Code Explorer, select **Run Command in Terminal...**, enter a command, and the extension opens a separate external terminal window to run it.

The menu is shown only for a single selected resource. It is hidden for multiple selections and blank-space context menus.

## How It Works

| Context-menu target | Input | Actual execution |
| --- | --- | --- |
| File A.js | cat | Opens an external terminal in the file's directory and runs cat followed by the safely quoted absolute path of A.js. |
| Folder Folder One | codex | Opens an external terminal with Folder One as the working directory and runs codex. |

For a file, the extension appends a safely quoted absolute path to the end of the command by default. To place the path in the middle of a command, use the {resource} placeholder, for example: git diff {resource}.

## Command History

Commands that successfully start an external terminal are saved in VS Code global storage. On the next run, select one of the 20 most recent commands or choose "Enter a new command...". Run "Explorer Terminal Command: Clear Command History" from the Command Palette to remove all saved commands.

## Terminal Selection

The default setting is auto: it first looks for PowerShell 7 (pwsh.exe), then falls back to Windows PowerShell and finally CMD on Windows. The terminal window stays open after the command completes.

Set explorerTerminalCommand.terminal in VS Code settings to pwsh, powershell, cmd, bash, or custom. For custom, also configure explorerTerminalCommand.customShellPath and explorerTerminalCommand.customShellFamily.

~~~json
{
  "explorerTerminalCommand.terminal": "cmd"
}
~~~

## Installation

Search for **Explorer Terminal Command** in the VS Code Extensions view, or use **Install from VSIX...** to select a packaged .vsix file and then reload the window.

## Development

~~~powershell
npm install
npm test
npm run package
~~~

Press F5 in VS Code to launch an Extension Development Host.

## License

[MIT](LICENSE)
