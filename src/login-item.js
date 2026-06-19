'use strict';

const { app } = require('electron');
const path = require('node:path');

const LOGIN_ITEM_NAME = 'TorCV';

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

function getLoginItemSettings(openAtLogin) {
  return {
    openAtLogin: !!openAtLogin,
    path: getLoginExecutablePath(),
    args: getLoginArguments(),
    name: LOGIN_ITEM_NAME,
    enabled: !!openAtLogin
  };
}

function getLoginItemQueryOptions() {
  return {
    path: getLoginExecutablePath(),
    args: getLoginArguments()
  };
}

function readLoginItemSettings() {
  return app.getLoginItemSettings(getLoginItemQueryOptions());
}

function setLoginItem(openAtLogin) {
  app.setLoginItemSettings(getLoginItemSettings(openAtLogin));
  return readLoginItemSettings();
}

module.exports = {
  LOGIN_ITEM_NAME,
  getLoginExecutablePath,
  getLoginArguments,
  getLoginItemSettings,
  getLoginItemQueryOptions,
  readLoginItemSettings,
  setLoginItem
};
