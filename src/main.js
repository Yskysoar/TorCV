'use strict';

const { app, globalShortcut } = require('electron');
const store = require('./store');
const state = require('./app-state');
const { registerIpcHandlers } = require('./ipc-handlers');
const { createTray } = require('./tray');
const { createManagerWindow, showClipboardPanel } = require('./manager-window');
const { startClipboardMonitor, stopClipboardMonitor } = require('./clipboard-monitor');
const { getForegroundWindowHandle } = require('./paste-simulator');

app.setAppUserModelId('com.torcv.app');

console.log('[main] app starting, data file:', store.filePath());

/** 快捷键回调：复用管理面板，并记录打开前的前台窗口用于自动粘贴 */
async function onQuickShortcut() {
  if (state.managerWin && !state.managerWin.isDestroyed() && state.managerWin.isVisible()) {
    state.managerWin.hide();
    state.targetHwnd = null;
    return;
  }
  state.targetHwnd = await getForegroundWindowHandle();
  console.log('[focus] target hwnd before shortcut panel:', state.targetHwnd || '(none)');
  showClipboardPanel();
}

/** 注册快捷键，失败返回 false */
function registerQuickShortcut(accelerator) {
  try { globalShortcut.unregister(accelerator); } catch (_) {}
  try { return globalShortcut.register(accelerator, onQuickShortcut); }
  catch (_) { return false; }
}

/** 把当前设置里的快捷键应用到系统 */
function applyQuickShortcutFromSettings() {
  if (state.currentShortcut) {
    try { globalShortcut.unregister(state.currentShortcut); } catch (_) {}
    state.currentShortcut = null;
  }
  const acc = store.getSettings().globalShortcut || 'Ctrl+Alt+V';
  if (registerQuickShortcut(acc)) {
    state.currentShortcut = acc;
    return true;
  }
  // 修复 #14：注册失败时输出警告
  console.warn('[shortcut] 全局快捷键注册失败:', acc);
  return false;
}

// ── App lifecycle ──

app.whenReady().then(() => {
  registerIpcHandlers(onQuickShortcut);
  createTray();
  createManagerWindow();
  startClipboardMonitor();
  applyQuickShortcutFromSettings();
});

app.on('window-all-closed', () => { /* stay in tray */ });
app.on('before-quit', () => { app.isQuitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); stopClipboardMonitor(); });
