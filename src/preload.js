'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipTabs', {
  data: {
    getGroups: () => ipcRenderer.invoke('ct:getGroups'),
    createGroup: (name) => ipcRenderer.invoke('ct:createGroup', { name }),
    updateGroup: (id, patch) => ipcRenderer.invoke('ct:updateGroup', { id, ...patch }),
    deleteGroup: (id) => ipcRenderer.invoke('ct:deleteGroup', { id }),
    createItem: (groupId, text) => ipcRenderer.invoke('ct:createItem', { groupId, text }),
    updateItem: (groupId, id, patch) => ipcRenderer.invoke('ct:updateItem', { groupId, id, patch }),
    deleteItem: (groupId, id) => ipcRenderer.invoke('ct:deleteItem', { groupId, id }),
    reorderItems: (groupId, orderedIds) => ipcRenderer.invoke('ct:reorderItems', { groupId, orderedIds })
  },
  settings: {
    get: () => ipcRenderer.invoke('ct:getSettings'),
    update: (patch) => ipcRenderer.invoke('ct:updateSettings', patch),
    getLoginItem: () => ipcRenderer.invoke('ct:getLoginItem'),
    setLoginItem: (openAtLogin) => ipcRenderer.invoke('ct:setLoginItem', { openAtLogin }),
    setGlobalShortcut: (accelerator) => ipcRenderer.invoke('ct:setGlobalShortcut', { accelerator }),
    resetShortcuts: () => ipcRenderer.invoke('ct:resetShortcuts')
  },
  clipboard: {
    getText: () => ipcRenderer.invoke('ct:getClipboardText'),
    pasteItem: (text, groupId, itemId) => ipcRenderer.invoke('ct:pasteItem', { text, groupId, itemId }),
    clearHistory: () => ipcRenderer.invoke('ct:clearClipboardHistory')
  },
  window: {
    showManager: () => ipcRenderer.invoke('ct:showManager'),
    showSettings: () => ipcRenderer.invoke('ct:showSettings'),
    rendererReady: () => ipcRenderer.invoke('ct:rendererReady'),
    closePanel: () => ipcRenderer.invoke('ct:closePanel'),
    minimizeManager: () => ipcRenderer.invoke('ct:minimizeManager'),
    closeManager: () => ipcRenderer.invoke('ct:closeManager')
  },
  on: (channel, cb) => {
    const valid = ['ct:dataChanged', 'ct:clipboardUpdate', 'ct:settingsChanged', 'ct:openClipboard', 'ct:openSettings'];
    if (!valid.includes(channel)) return () => {};
    const handler = (_event, data) => cb(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});
