'use strict';

let getForegroundWindowNative = null;

try {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');

  getForegroundWindowNative = user32.func('__stdcall', 'GetForegroundWindow', 'uintptr_t', []);
} catch (err) {
  console.warn('[win32] native initialization failed:', err.message);
}

function normalizeHandle(value) {
  if (typeof value === 'bigint') {
    if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }

  const hwnd = Number(value);
  return Number.isFinite(hwnd) && hwnd > 0 ? Math.trunc(hwnd) : null;
}

function getForegroundWindowHandleSync() {
  if (!getForegroundWindowNative) return null;

  try {
    return normalizeHandle(getForegroundWindowNative());
  } catch (err) {
    console.warn('[win32] GetForegroundWindow failed:', err.message);
    return null;
  }
}

module.exports = { getForegroundWindowHandleSync };
