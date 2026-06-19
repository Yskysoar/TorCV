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
