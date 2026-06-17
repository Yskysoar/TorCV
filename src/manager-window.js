'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const state = require('./app-state');

const PANEL_BOUNDS = { width: 400, height: 400, minWidth: 350, minHeight: 345 };

// ── Manager window ─────────────────────────────────────────────────────────

function createManagerWindow() {
  if (state.managerWin && !state.managerWin.isDestroyed()) { state.managerWin.show(); state.managerWin.focus(); return state.managerWin; }
  state.managerWin = new BrowserWindow({
    width: PANEL_BOUNDS.width, height: PANEL_BOUNDS.height, minWidth: PANEL_BOUNDS.minWidth, minHeight: PANEL_BOUNDS.minHeight,
    frame: false, show: false, resizable: false, skipTaskbar: true,
    backgroundColor: '#f6f7f9',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  state.managerWin.loadFile(path.join(__dirname, 'main', 'index.html'));
  state.managerWin.webContents.on('did-fail-load', (_e, code, desc) => console.error('[main] manager load failed:', code, desc));
  state.managerWin.webContents.on('console-message', (_e, level, msg) => console.log('[renderer]', msg));
  state.managerWin.once('ready-to-show', () => { state.managerWin.show(); });
  state.managerWin.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); state.managerWin.hide(); } });
  return state.managerWin;
}

function showManagerSettings() {
  state.targetHwnd = null;
  state.pendingOpenClipboard = false;
  state.pendingOpenSettings = true;
  const win = createManagerWindow();
  if (!win.webContents.isLoading()) {
    win.webContents.send('ct:openSettings');
    state.pendingOpenSettings = false;
  }
}

function showClipboardPanel() {
  state.pendingOpenSettings = false;
  state.pendingOpenClipboard = true;
  const win = createManagerWindow();
  if (!win.webContents.isLoading()) {
    win.webContents.send('ct:openClipboard');
    state.pendingOpenClipboard = false;
  }
}

module.exports = { createManagerWindow, showManagerSettings, showClipboardPanel, PANEL_BOUNDS };
