'use strict';

const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('node:path');
const state = require('./app-state');
const { showClipboardPanel, showManagerSettings } = require('./manager-window');

let tray = null;

// ── Tray icon ──────────────────────────────────────────────────────────────

function trayIconImage() {
  const sizes = [16, 32, 48];
  const images = sizes
    .map((s) => {
      const img = nativeImage.createFromPath(path.join(__dirname, `tray-${s}.png`));
      return img.isEmpty() ? null : img;
    })
    .filter(Boolean);
  if (images.length === 0) {
    // Fallback: scale the source icon
    const full = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    if (!full.isEmpty()) {
      const resized = full.resize({ width: 16, height: 16 });
      return resized.isEmpty() ? full : resized;
    }
    return nativeImage.createEmpty();
  }
  // Electron picks the best DPR resolution from a multi-size image
  const multi = nativeImage.createEmpty();
  images.forEach((img) => multi.addRepresentation({ scaleFactor: img.getSize().width / 16, image: img.toPNG() }));
  return multi.isEmpty() ? images[0] : multi;
}

// ── Tray ───────────────────────────────────────────────────────────────────

function createTray() {
  tray = new Tray(trayIconImage());
  tray.setToolTip('TorCV — 剪切板文本管理');
  const ctx = Menu.buildFromTemplate([
    { label: '打开', click: () => { state.targetHwnd = null; showClipboardPanel(); } },
    { label: '设置', click: () => showManagerSettings() },
    { label: '退出', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(ctx);
  tray.on('click', () => {
    state.targetHwnd = null;
    showClipboardPanel();
  });
}

module.exports = { createTray };
