'use strict';

const { clipboard } = require('electron');
const store = require('./store');
const { broadcastDataChanged, broadcastClipboardUpdate } = require('./ipc-handlers');

let clipboardTimer = null;
let lastClipboardText = '';

// ── 安全读取剪贴板 ──────────────────────────────────────────────────────────

function safeReadClipboard() {
  try { return clipboard.readText() || ''; }
  catch (_) { return ''; }
}

// ── Clipboard monitor ──────────────────────────────────────────────────────

function startClipboardMonitor() {
  try { store.ensureClipboardGroup(); } catch (_) {}
  lastClipboardText = safeReadClipboard();
  clipboardTimer = setInterval(() => {
    const text = safeReadClipboard();
    if (text !== lastClipboardText) {
      lastClipboardText = text;
      if (text && store.getSettings().clipboardMonitor !== false) {
        try {
          const result = store.upsertClipboardItem(text);
          if (result.changed) broadcastDataChanged();
        } catch (_) {}
        broadcastClipboardUpdate(text);
      }
    }
  }, 500);
}

function stopClipboardMonitor() {
  if (clipboardTimer) { clearInterval(clipboardTimer); clipboardTimer = null; }
}

module.exports = { startClipboardMonitor, stopClipboardMonitor };
