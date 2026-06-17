'use strict';

const { app, clipboard, globalShortcut, ipcMain, BrowserWindow } = require('electron');
const store = require('./store');
const state = require('./app-state');
const { showClipboardPanel, showManagerSettings } = require('./manager-window');
const { getForegroundWindowHandle, simulatePaste, restoreTargetFocus } = require('./paste-simulator');
const { readLoginItemSettings, setLoginItem } = require('./login-item');

// ── 安全读取剪贴板 ──────────────────────────────────────────────────────────

function safeReadClipboard() {
  try { return clipboard.readText() || ''; }
  catch (_) { return ''; }
}

// ── 广播函数 ────────────────────────────────────────────────────────────────

function broadcastDataChanged() {
  const groups = store.getGroups();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send('ct:dataChanged', { groups });
  });
}

function broadcastSettingsChanged() {
  const settings = store.getSettings();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send('ct:settingsChanged', { settings });
  });
}

function broadcastClipboardUpdate(text) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send('ct:clipboardUpdate', { text });
  });
}

// ── IPC handlers ───────────────────────────────────────────────────────────

function registerIpcHandlers(onQuickShortcut) {
  ipcMain.handle('ct:getGroups', () => store.getGroups());

  ipcMain.handle('ct:createGroup', (_e, { name } = {}) => {
    try {
      const group = store.createGroup(name);
      broadcastDataChanged();
      return { ok: true, group };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('ct:updateGroup', (_e, { id, name, order } = {}) => {
    try {
      const group = store.updateGroup(id, { name, order });
      broadcastDataChanged();
      return { ok: true, group };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 修复 #1：补 try-catch
  ipcMain.handle('ct:deleteGroup', (_e, { id } = {}) => {
    try {
      store.deleteGroup(id);
      broadcastDataChanged();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('ct:createItem', (_e, { groupId, text, order } = {}) => {
    try {
      const item = store.createItem(groupId, text, { order });
      broadcastDataChanged();
      return { ok: true, item };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('ct:updateItem', (_e, { groupId, id, text, patch } = {}) => {
    try {
      const item = store.updateItem(groupId, id, patch && typeof patch === 'object' ? patch : { text });
      broadcastDataChanged();
      return { ok: true, item };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 修复 #1：补 try-catch
  ipcMain.handle('ct:deleteItem', (_e, { groupId, id } = {}) => {
    try {
      store.deleteItem(groupId, id);
      broadcastDataChanged();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('ct:reorderItems', (_e, { groupId, orderedIds } = {}) => {
    try {
      const items = store.reorderItems(groupId, orderedIds);
      broadcastDataChanged();
      return { ok: true, items };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('ct:getSettings', () => store.getSettings());

  ipcMain.handle('ct:updateSettings', (_e, patch) => {
    const settings = store.updateSettings(patch);
    broadcastSettingsChanged();
    return settings;
  });

  // ── 开机自启动 ──
  ipcMain.handle('ct:getLoginItem', () => {
    const openAtLogin = !!(app.getLoginItemSettings && readLoginItemSettings().openAtLogin);
    store.updateSettings({ openAtLogin });
    return { openAtLogin };
  });

  ipcMain.handle('ct:setLoginItem', (_e, { openAtLogin } = {}) => {
    const val = !!openAtLogin;
    try { setLoginItem(val); }
    catch (err) { console.error('[loginitem] set failed:', err.message); return { openAtLogin: !val, error: err.message }; }
    const settings = store.updateSettings({ openAtLogin: val });
    broadcastSettingsChanged();
    return { openAtLogin: settings.openAtLogin };
  });

  // ── 全局触发快捷键录制 ──
  ipcMain.handle('ct:setGlobalShortcut', (_e, { accelerator } = {}) => {
    const acc = String(accelerator || '').trim();
    if (!acc) return { ok: false, error: '快捷键为空' };
    // 校验：必须含至少一个修饰键 + 一个非修饰主键
    const parts = acc.split('+').map((s) => s.trim()).filter(Boolean);
    const hasMod = parts.some((p) => /^(Ctrl|Control|Cmd|Command|Alt|Option|Shift|Super|Meta)$/i.test(p));
    const main = parts.filter((p) => !/^(Ctrl|Control|Cmd|Command|Alt|Option|Shift|Super|Meta)$/i.test(p));
    if (!hasMod || main.length !== 1) {
      return { ok: false, error: '需修饰键 + 一个主键' };
    }
    const prev = state.currentShortcut || store.getSettings().globalShortcut || 'Ctrl+Alt+V';
    try { if (state.currentShortcut) globalShortcut.unregister(state.currentShortcut); } catch (_) {}
    let ok = false;
    try { ok = globalShortcut.register(acc, onQuickShortcut); } catch (_) { ok = false; }
    if (!ok) {
      try { globalShortcut.register(prev, onQuickShortcut); } catch (_) {}
      state.currentShortcut = prev;
      return { ok: false, error: '快捷键无效或已被占用' };
    }
    state.currentShortcut = acc;
    store.updateSettings({ globalShortcut: acc });
    broadcastSettingsChanged();
    return { ok: true, accelerator: acc };
  });

  // ── 恢复默认快捷键设置 ──
  ipcMain.handle('ct:resetShortcuts', () => {
    const defaults = {
      globalShortcut: 'Ctrl+Alt+V',
      keymap: { up: 'W', down: 'S', left: 'A', right: 'D', confirm: 'F' }
    };
    // 重新注册全局触发键
    if (state.currentShortcut) {
      try { globalShortcut.unregister(state.currentShortcut); } catch (_) {}
      state.currentShortcut = null;
    }
    let ok = false;
    try { ok = globalShortcut.register(defaults.globalShortcut, onQuickShortcut); } catch (_) { ok = false; }
    if (ok) state.currentShortcut = defaults.globalShortcut;
    const settings = store.updateSettings(defaults);
    broadcastSettingsChanged();
    return { ok: true, settings };
  });

  // 修复 #2：safeReadClipboard
  ipcMain.handle('ct:getClipboardText', () => safeReadClipboard());

  ipcMain.handle('ct:clearClipboardHistory', () => {
    const result = store.clearClipboardHistory();
    if (result.changed) broadcastDataChanged();
    return { ok: true, changed: !!result.changed };
  });

  // 修复 #2：safeReadClipboard
  ipcMain.handle('ct:pasteItem', async (_event, { text, groupId, itemId } = {}) => {
    if (!text) return { ok: false, error: 'Empty text' };
    const settings = store.getSettings();
    const panelWin = state.managerWin;
    const prev = safeReadClipboard();
    clipboard.writeText(text);
    console.log('[paste] clipboard written, text length:', text.length);
    if (groupId && itemId) store.markUsed(groupId, itemId);
    if (settings.autoPaste === false) {
      if (panelWin && !panelWin.isDestroyed() && panelWin.isVisible()) panelWin.hide();
      await restoreTargetFocus(state.targetHwnd);
      state.targetHwnd = null;
      return { ok: true, copied: true };
    }
    try {
      if (!panelWin || panelWin.isDestroyed()) { console.log('[paste] panel window already gone'); return { ok: false }; }
      console.log('[paste] hiding panel window...');
      const hidden = panelWin.isVisible() ? new Promise((r) => panelWin.once('hide', r)) : Promise.resolve();
      if (panelWin.isVisible()) panelWin.hide();
      await Promise.race([hidden, new Promise((r) => setTimeout(r, 60))]);
      console.log('[paste] window hidden, restoring target focus:', state.targetHwnd || '(none)');
      const success = await simulatePaste(state.targetHwnd);
      console.log('[paste] simulatePaste result:', success);
      if (success) setTimeout(() => { if (prev) clipboard.writeText(prev); else clipboard.clear(); }, 500);
      return success ? { ok: true } : { ok: false, error: 'TARGET_FOCUS_FAILED', copied: true };
    } finally {
      await restoreTargetFocus(state.targetHwnd);
      state.targetHwnd = null;
    }
  });

  ipcMain.handle('ct:showManager', () => { state.targetHwnd = null; showClipboardPanel(); return { ok: true }; });
  ipcMain.handle('ct:showSettings', () => { showManagerSettings(); return { ok: true }; });
  ipcMain.handle('ct:rendererReady', () => {
    const openClipboard = state.pendingOpenClipboard;
    const openSettings = state.pendingOpenSettings;
    state.pendingOpenClipboard = false;
    state.pendingOpenSettings = false;
    return { openClipboard, openSettings };
  });
  ipcMain.handle('ct:closePanel', (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (state.managerWin && !state.managerWin.isDestroyed() && (!senderWin || senderWin === state.managerWin)) state.managerWin.hide();
    state.targetHwnd = null;
    return { ok: true };
  });
  ipcMain.handle('ct:minimizeManager', () => {
    if (state.managerWin && !state.managerWin.isDestroyed()) state.managerWin.minimize();
    return { ok: true };
  });
  ipcMain.handle('ct:closeManager', () => {
    if (state.managerWin && !state.managerWin.isDestroyed()) state.managerWin.hide();
    state.targetHwnd = null;
    return { ok: true };
  });
}

module.exports = { registerIpcHandlers, broadcastDataChanged, broadcastSettingsChanged, broadcastClipboardUpdate };
