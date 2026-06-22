'use strict';

const { app } = require('electron');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const LOGIN_ITEM_NAME = 'TorCV';
const LOGIN_ITEM_REG_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';

function getLoginExecutablePath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function getDevelopmentAppPath() {
  const appPath = app.getAppPath();
  if (appPath && path.isAbsolute(appPath) && appPath !== 'path-to-app') return appPath;
  return process.cwd();
}

function getLoginArguments() {
  return app.isPackaged ? [] : [getDevelopmentAppPath()];
}

function quoteWindowsArgument(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function buildLoginCommand() {
  const parts = [quoteWindowsArgument(getLoginExecutablePath())];
  for (const arg of getLoginArguments()) {
    parts.push(quoteWindowsArgument(arg));
  }
  return parts.join(' ');
}

function runRegistryCommand(args) {
  if (process.platform !== 'win32') return { status: 1, stderr: 'Windows only' };
  return spawnSync('reg', args, { encoding: 'utf8', windowsHide: true });
}

function loginItemExists() {
  const result = runRegistryCommand(['query', LOGIN_ITEM_REG_PATH, '/v', LOGIN_ITEM_NAME]);
  return result.status === 0;
}

function readLoginItemSettings() {
  return { openAtLogin: loginItemExists() };
}

function setLoginItem(openAtLogin) {
  if (process.platform === 'win32') {
    if (openAtLogin) {
      runRegistryCommand([
        'add',
        LOGIN_ITEM_REG_PATH,
        '/v',
        LOGIN_ITEM_NAME,
        '/t',
        'REG_SZ',
        '/d',
        buildLoginCommand(),
        '/f'
      ]);
    } else {
      runRegistryCommand(['delete', LOGIN_ITEM_REG_PATH, '/v', LOGIN_ITEM_NAME, '/f']);
      runRegistryCommand(['delete', LOGIN_ITEM_REG_PATH, '/v', 'tie-z', '/f']);
      runRegistryCommand(['delete', LOGIN_ITEM_REG_PATH, '/v', 'tiez-app', '/f']);
    }
  }
  return readLoginItemSettings();
}

module.exports = {
  LOGIN_ITEM_NAME,
  LOGIN_ITEM_REG_PATH,
  getLoginExecutablePath,
  getLoginArguments,
  quoteWindowsArgument,
  buildLoginCommand,
  runRegistryCommand,
  loginItemExists,
  readLoginItemSettings,
  setLoginItem
};
