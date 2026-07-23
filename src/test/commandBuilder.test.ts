import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExternalTerminalArguments,
  buildTerminalCommand,
  buildWindowsStartArguments,
  quoteShellArgument,
} from '../commandBuilder';

test('PowerShell 为带空格和单引号的路径正确引用', () => {
  assert.equal(
    quoteShellArgument("D:\\代码 文件\\O'Brien.js", 'powershell'),
    "'D:\\代码 文件\\O''Brien.js'",
  );
});

test('文件命令默认在末尾追加资源路径', () => {
  assert.equal(
    buildTerminalCommand('cat', 'D:\\项目\\A.js', false, 'powershell'),
    "cat 'D:\\项目\\A.js'",
  );
});

test('文件命令可在指定位置使用 resource 占位符', () => {
  assert.equal(
    buildTerminalCommand('git diff {resource}', 'D:\\项目\\A.js', false, 'powershell'),
    "git diff 'D:\\项目\\A.js'",
  );
});

test('文件夹命令不追加路径', () => {
  assert.equal(
    buildTerminalCommand('codex', 'D:\\项目\\文件夹一', true, 'powershell'),
    'codex',
  );
});

test('CMD 使用双引号引用路径', () => {
  assert.equal(
    buildTerminalCommand('type', 'D:\\项目 文件\\A.js', false, 'cmd'),
    'type "D:\\项目 文件\\A.js"',
  );
});

test('PowerShell 在外部窗口执行后保持打开', () => {
  assert.deepEqual(
    buildExternalTerminalArguments("cat 'D:\\项目\\A.js'", 'powershell'),
    ['-NoExit', '-Command', "cat 'D:\\项目\\A.js'"],
  );
});

test('CMD 在外部窗口执行后保持打开', () => {
  assert.deepEqual(
    buildExternalTerminalArguments('type "D:\\项目\\A.js"', 'cmd'),
    ['/K', 'type "D:\\项目\\A.js"'],
  );
});

test('Windows 使用 start 显式创建新的外部终端窗口', () => {
  assert.deepEqual(
    buildWindowsStartArguments(
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      ['-NoExit', '-Command', "cat 'D:\\项目\\A.js'"],
    ),
    [
      '/d',
      '/c',
      'start',
      '""',
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      '-NoExit',
      '-Command',
      "cat 'D:\\项目\\A.js'",
    ],
  );
});
