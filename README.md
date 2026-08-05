# 资源管理器终端命令

<!-- codex-github-rules:bilingual-summary -->
> **中文简介**：从 VS Code 资源管理器在外部终端执行自定义命令

> **English summary**: Run custom commands in an external terminal from VS Code Explorer

---

在 VS Code 资源管理器中右键单个文件或单个文件夹，选择“在终端中执行命令...”，输入命令后会打开一个独立的外部终端窗口执行。

菜单只会在单选资源时显示，多选或右键空白处不会显示。

## 工作方式

| 右键对象 | 输入 | 实际执行方式 |
| --- | --- | --- |
| 文件 `A.js` | `cat` | 打开外部终端，在文件所在目录执行 `cat 'A.js 的完整路径'` |
| 文件夹 `文件夹一` | `codex` | 打开外部终端，以 `文件夹一` 为工作目录执行 `codex` |

对于文件，扩展默认把安全引用后的完整路径追加到命令末尾。需要把路径放到中间时，可以在命令内写 `{resource}`，例如 `git diff {resource}`。

## 终端选择

默认设置为 `auto`：优先寻找 PowerShell 7 的 `pwsh.exe`；找不到时在 Windows 上回退到 Windows PowerShell，再回退到 CMD。命令执行后终端窗口会保持打开。

在 VS Code 设置中修改 `explorerTerminalCommand.terminal`，可选择 `pwsh`、`powershell`、`cmd`、`bash` 或 `custom`。使用 `custom` 时，同时设置 `explorerTerminalCommand.customShellPath` 和对应的 `explorerTerminalCommand.customShellFamily`。

```json
{
  "explorerTerminalCommand.terminal": "cmd"
}
```

## 安装

可在 VS Code 扩展视图搜索“资源管理器终端命令”安装，或执行“从 VSIX 安装...”并选择打包生成的 `.vsix` 文件，然后重新加载窗口。

## 开发

```powershell
npm install
npm test
npm run package
```

在 VS Code 中按 `F5` 会启动 Extension Development Host。

## 许可证

[MIT](LICENSE)
