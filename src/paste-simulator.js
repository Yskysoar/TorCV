'use strict';

const { execFile } = require('node:child_process');
const { getForegroundWindowHandleSync } = require('./win32');

/** 公共 User32 P/Invoke 声明，供 PowerShell Add-Type 使用 */
const USER32_METHODS = {
  getForegroundWindow: `[DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();`,
  isWindow: `[DllImport("user32.dll")]
  public static extern bool IsWindow(IntPtr hWnd);`,
  isIconic: `[DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr hWnd);`,
  showWindow: `[DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);`,
  setForegroundWindow: `[DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);`,
  bringWindowToTop: `[DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);`,
  keybdEvent: `[DllImport("user32.dll")]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);`
};

function user32Declaration(methods) {
  return `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class User32 {
  ${methods.join('\n  ')}
}
"@`;
}

const USER32_BASIC = user32Declaration([USER32_METHODS.getForegroundWindow]);
const USER32_FOCUS = user32Declaration([
  USER32_METHODS.isWindow,
  USER32_METHODS.isIconic,
  USER32_METHODS.showWindow,
  USER32_METHODS.setForegroundWindow,
  USER32_METHODS.bringWindowToTop
]);
const USER32_FULL = user32Declaration([
  USER32_METHODS.getForegroundWindow,
  USER32_METHODS.isWindow,
  USER32_METHODS.isIconic,
  USER32_METHODS.showWindow,
  USER32_METHODS.setForegroundWindow,
  USER32_METHODS.bringWindowToTop,
  USER32_METHODS.keybdEvent
]);

// ── 导出函数 ──────────────────────────────────────────────────────────────

function getForegroundWindowHandle() {
  const nativeHwnd = getForegroundWindowHandleSync();
  if (nativeHwnd) return Promise.resolve(nativeHwnd);

  return new Promise((resolve) => {
    const ps = `
${USER32_BASIC}
[User32]::GetForegroundWindow().ToInt64()
`;
    execFile('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true, timeout: 3000 }, (err, stdout, stderr) => {
      if (err) {
        console.log('[focus] GetForegroundWindow error:', err.message, 'stderr:', stderr);
        resolve(null);
        return;
      }
      const hwnd = Number(String(stdout || '').trim());
      resolve(Number.isFinite(hwnd) && hwnd > 0 ? hwnd : null);
    });
  });
}

function simulatePaste(hwnd) {
  return new Promise((resolve) => {
    const target = Number.isFinite(Number(hwnd)) ? Math.trunc(Number(hwnd)) : 0;
    if (target <= 0) {
      resolve(false);
      return;
    }
    const ps = `
Add-Type -AssemblyName System.Windows.Forms
${USER32_FULL}
$target = [IntPtr]${target}
if (${target} -gt 0 -and [User32]::IsWindow($target)) {
  if ([User32]::IsIconic($target)) {
    [void][User32]::ShowWindow($target, 9)
  }
[User32]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
$focused = [User32]::SetForegroundWindow($target)
[User32]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[void][User32]::BringWindowToTop($target)
if (-not $focused) { $focused = [User32]::SetForegroundWindow($target) }
Start-Sleep -Milliseconds 180
  $active = [User32]::GetForegroundWindow()
  if ($active -ne $target) {
    Write-Output "TARGET_FOCUS_FAILED"
    exit 2
  }
} else {
  Write-Output "TARGET_INVALID"
  exit 3
}
[System.Windows.Forms.SendKeys]::SendWait('^v')
[System.Windows.Forms.SendKeys]::Flush()
if (${target} -gt 0 -and [User32]::IsWindow($target)) {
  Start-Sleep -Milliseconds 80
  [void][User32]::SetForegroundWindow($target)
  [void][User32]::BringWindowToTop($target)
}
Write-Output "PASTE_OK"
`;
    execFile('powershell', ['-STA', '-NoProfile', '-Command', ps], { windowsHide: true, timeout: 3000 }, (err, stdout, stderr) => {
      const out = String(stdout || '').trim();
      if (err) console.log('[paste] PowerShell error:', err.message, 'stdout:', out, 'stderr:', stderr);
      else console.log('[paste] PowerShell OK', out);
      resolve(!err && out.includes('PASTE_OK'));
    });
  });
}

function restoreTargetFocus(hwnd) {
  return new Promise((resolve) => {
    const target = Number.isFinite(Number(hwnd)) ? Math.trunc(Number(hwnd)) : 0;
    if (target <= 0) {
      resolve(false);
      return;
    }
    const ps = `
${USER32_FOCUS}
$target = [IntPtr]${target}
if ([User32]::IsWindow($target)) {
  if ([User32]::IsIconic($target)) {
    [void][User32]::ShowWindow($target, 9)
  }
  [void][User32]::SetForegroundWindow($target)
  [void][User32]::BringWindowToTop($target)
}
`;
    execFile('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true, timeout: 3000 }, (err, stdout, stderr) => {
      if (err) console.log('[focus] restore error:', err.message, 'stderr:', stderr);
      resolve(!err);
    });
  });
}

module.exports = { getForegroundWindowHandle, simulatePaste, restoreTargetFocus };
