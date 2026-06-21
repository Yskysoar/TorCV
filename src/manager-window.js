'use strict';

const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');
const state = require('./app-state');

const PANEL_BOUNDS = { width: 400, height: 400, minWidth: 350, minHeight: 345 };
const PANEL_CURSOR_OFFSET = 12;

// ── Manager window ─────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionNearCursor(win) {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const area = display.workArea;
  const bounds = win.getBounds();
  const width = bounds.width || PANEL_BOUNDS.width;
  const height = bounds.height || PANEL_BOUNDS.height;
  let x = point.x - Math.round(width / 2);
  let y = point.y + PANEL_CURSOR_OFFSET;

  if (y + height > area.y + area.height) y = point.y - height - PANEL_CURSOR_OFFSET;
  x = clamp(x, area.x + 5, area.x + area.width - width - 5);
  y = clamp(y, area.y + 5, area.y + area.height - height - 5);
  win.setPosition(x, y, false);
}

function resetPanelBounds(win) {
  win.setSize(PANEL_BOUNDS.width, PANEL_BOUNDS.height, false);
}

function showWindow(win) {
  resetPanelBounds(win);
  win.show();
  win.focus();
}

function createManagerWindow() {
  if (state.managerWin && !state.managerWin.isDestroyed()) return state.managerWin;
  state.managerWin = new BrowserWindow({
    width: PANEL_BOUNDS.width, height: PANEL_BOUNDS.height, minWidth: PANEL_BOUNDS.minWidth, minHeight: PANEL_BOUNDS.minHeight,
    frame: false, show: false, resizable: false, skipTaskbar: true,
    backgroundColor: '#f6f7f9',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  state.managerWin.loadFile(path.join(__dirname, 'main', 'index.html'));
  state.managerWin.webContents.on('did-fail-load', (_e, code, desc) => console.error('[main] manager load failed:', code, desc));
  state.managerWin.webContents.on('console-message', (_e, level, msg) => console.log('[renderer]', msg));
  state.managerWin.once('ready-to-show', () => {
    if (state.pendingOpenClipboard || state.pendingOpenSettings) showWindow(state.managerWin);
  });
  state.managerWin.on('blur', () => {
    if (app.isQuitting || state.managerWin.isDestroyed() || !state.managerWin.isVisible()) return;
    state.targetHwnd = null;
    state.managerWin.hide();
  });
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
    showWindow(win);
  }
}

function showClipboardPanel() {
  state.pendingOpenSettings = false;
  state.pendingOpenClipboard = true;
  const win = createManagerWindow();
  resetPanelBounds(win);
  positionNearCursor(win);
  if (!win.webContents.isLoading()) {
    win.webContents.send('ct:openClipboard');
    state.pendingOpenClipboard = false;
    showWindow(win);
  }
}

module.exports = { createManagerWindow, showManagerSettings, showClipboardPanel, PANEL_BOUNDS, positionNearCursor };
