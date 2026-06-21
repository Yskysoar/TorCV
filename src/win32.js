'use strict';

let getForegroundWindowNative = null;
let isWindowNative = null;
let isIconicNative = null;
let showWindowNative = null;
let setForegroundWindowNative = null;
let bringWindowToTopNative = null;
let keybdEventNative = null;

try {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');

  getForegroundWindowNative = user32.func('__stdcall', 'GetForegroundWindow', 'uintptr_t', []);
  isWindowNative = user32.func('__stdcall', 'IsWindow', 'bool', ['uintptr_t']);
  isIconicNative = user32.func('__stdcall', 'IsIconic', 'bool', ['uintptr_t']);
  showWindowNative = user32.func('__stdcall', 'ShowWindow', 'bool', ['uintptr_t', 'int']);
  setForegroundWindowNative = user32.func('__stdcall', 'SetForegroundWindow', 'bool', ['uintptr_t']);
  bringWindowToTopNative = user32.func('__stdcall', 'BringWindowToTop', 'bool', ['uintptr_t']);
  keybdEventNative = user32.func('__stdcall', 'keybd_event', 'void', ['uint8', 'uint8', 'uint32', 'uintptr_t']);
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

function keyDown(vk) {
  keybdEventNative(vk, 0, 0, 0);
}

function keyUp(vk) {
  keybdEventNative(vk, 0, 2, 0);
}

function releaseModifiers() {
  [0x5B, 0x5C, 0x12, 0x10, 0x11].forEach(keyUp);
}

function nativePasteSync(hwnd) {
  const target = normalizeHandle(hwnd);
  if (!target || !isWindowNative || !keybdEventNative) return null;

  try {
    if (!isWindowNative(target)) return false;
    if (isIconicNative(target)) showWindowNative(target, 9);

    releaseModifiers();
    keyDown(0x12);
    const focused = setForegroundWindowNative(target);
    keyUp(0x12);
    bringWindowToTopNative(target);
    if (!focused) setForegroundWindowNative(target);

    const active = getForegroundWindowHandleSync();
    if (active !== target) return false;

    releaseModifiers();
    keyDown(0x11);
    keyDown(0x56);
    keyUp(0x56);
    keyUp(0x11);
    releaseModifiers();
    return true;
  } catch (err) {
    console.warn('[win32] native paste failed:', err.message);
    return null;
  }
}

function nativeRestoreFocusSync(hwnd) {
  const target = normalizeHandle(hwnd);
  if (!target || !isWindowNative || !setForegroundWindowNative) return null;

  try {
    if (!isWindowNative(target)) return false;
    if (isIconicNative(target)) showWindowNative(target, 9);
    keyDown(0x12);
    const focused = setForegroundWindowNative(target);
    keyUp(0x12);
    bringWindowToTopNative(target);
    return !!focused || !!setForegroundWindowNative(target);
  } catch (err) {
    console.warn('[win32] native focus restore failed:', err.message);
    return null;
  }
}

module.exports = { getForegroundWindowHandleSync, nativePasteSync, nativeRestoreFocusSync };
