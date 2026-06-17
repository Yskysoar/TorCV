'use strict';

const { app } = require('electron');

const LOGIN_ITEM_NAME = 'TorCV';

function getLoginExecutablePath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function quoteArgument(value) {
  const text = String(value || '');
  return /^".*"$/.test(text) ? text : `"${text.replace(/"/g, '\\"')}"`;
}

function getLoginArguments() {
  return app.isPackaged ? [] : [quoteArgument(app.getAppPath())];
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
