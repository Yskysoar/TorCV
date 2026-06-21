'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const pkg = require('../package.json');
const win32 = require('../src/win32');

test('package metadata is aligned with TorCV rename', () => {
  assert.equal(pkg.name, 'torcv');
  assert.equal(pkg.productName, 'TorCV');
  assert.equal(pkg.author, 'TorCV');
  assert.equal(pkg.build.productName, 'TorCV');
  assert.equal(pkg.build.appId, 'com.torcv.app');
  assert.equal(pkg.build.portable.artifactName, 'TorCV-${version}.exe');
});

test('quality scripts are available', () => {
  assert.equal(pkg.scripts.lint, 'node scripts/check-js.js');
  assert.equal(pkg.scripts.typecheck, 'node scripts/check-js.js');
  assert.equal(pkg.scripts.test, 'node --test');
});

test('native Win32 foreground handle helper is available', () => {
  assert.equal(typeof win32.getForegroundWindowHandleSync, 'function');
  assert.equal(typeof win32.nativePasteSync, 'function');
  assert.equal(typeof win32.nativeRestoreFocusSync, 'function');
});

test('removed design-demo and quick implementations stay absent', () => {
  assert.equal(existsSync(join(root, 'design-demo')), false);
  assert.equal(existsSync(join(root, 'src', 'quick')), false);
});

test('login item uses real app path without pre-quoting development args', () => {
  const loginItemSource = readFileSync(join(root, 'src', 'login-item.js'), 'utf8');
  assert.equal(loginItemSource.includes('quoteArgument'), false);
  assert.match(loginItemSource, /path\.isAbsolute\(appPath\)/);
  assert.match(loginItemSource, /app\.isPackaged \? \[\] : \[getDevelopmentAppPath\(\)\]/);
});

test('clipboard panel follows cursor and paste has native path', () => {
  const managerWindowSource = readFileSync(join(root, 'src', 'manager-window.js'), 'utf8');
  const pasteSource = readFileSync(join(root, 'src', 'paste-simulator.js'), 'utf8');
  assert.match(managerWindowSource, /getCursorScreenPoint/);
  assert.match(managerWindowSource, /getDisplayNearestPoint/);
  assert.match(managerWindowSource, /setSize\(PANEL_BOUNDS\.width, PANEL_BOUNDS\.height/);
  assert.match(managerWindowSource, /\.on\('blur'/);
  assert.match(pasteSource, /nativePasteSync/);
  assert.match(pasteSource, /PowerShell/);
});

test('clipboard view renders fixed three-slot window', () => {
  const clipboardViewSource = readFileSync(join(root, 'src', 'main', 'clipboard-view.js'), 'utf8');
  const rendererStateSource = readFileSync(join(root, 'src', 'main', 'renderer-state.js'), 'utf8');
  const stylesSource = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
  assert.match(clipboardViewSource, /function visibleItemWindow/);
  assert.match(clipboardViewSource, /VISIBLE_ITEM_COUNT = 3/);
  assert.match(clipboardViewSource, /clipboardWindowStart/);
  assert.match(clipboardViewSource, /selectedIndex >= start \+ VISIBLE_ITEM_COUNT/);
  assert.match(rendererStateSource, /clipboardWindowStart: 0/);
  assert.match(clipboardViewSource, /visibleItems\.map/);
  assert.match(stylesSource, /\.clip-list \{ gap: 8px; \}/);
  assert.match(stylesSource, /height: 78px; padding: 10px 11px/);
  assert.equal(clipboardViewSource.includes('items.length ? items.map'), false);
});
