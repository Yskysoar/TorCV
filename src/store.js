'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

function defaultData() {
  return {
    version: 1,
    groups: [
      { id: id('g'), name: '默认', order: 0, createdAt: now(), items: [] }
    ],
    settings: {
      globalShortcut: 'Ctrl+Alt+V',
      clipboardMonitor: true,
      autoPaste: true,
      openAtLogin: false,
      keymap: { up: 'W', down: 'S', left: 'A', right: 'D', confirm: 'F' }
    }
  };
}

function defaultKeymap(km) {
  return Object.assign({ up: 'W', down: 'S', left: 'A', right: 'D', confirm: 'F' }, km || {});
}

function normalizeGroupName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('GROUP_NAME_EMPTY');
  if (trimmed.length > 4) throw new Error('GROUP_NAME_TOO_LONG');
  return trimmed;
}

function appDataDir() {
  return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'TorCV');
}

function devDataDir() {
  return path.join(__dirname, '..', 'data');
}

function isPackagedRuntime() {
  return !!process.versions?.electron && process.defaultApp !== true;
}

function dataDir() {
  const dir = isPackagedRuntime() ? appDataDir() : devDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function dataPath() {
  const dir = dataDir();
  const next = path.join(dir, 'torcv.json');
  const legacyCandidates = isPackagedRuntime()
    ? [
        path.join(devDataDir(), 'torcv.json'),
        path.join(devDataDir(), 'cliptabs.json'),
        path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ClipTabs', 'cliptabs.json')
      ]
    : [
        path.join(dir, 'cliptabs.json'),
        path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ClipTabs', 'cliptabs.json')
      ];
  const legacy = legacyCandidates.find((candidate) => fs.existsSync(candidate));
  if (!fs.existsSync(next) && legacy) {
    fs.copyFileSync(legacy, next);
  }
  return next;
}

let _cache = null;
let _path = null;

function filePath() {
  if (!_path) _path = dataPath();
  return _path;
}

function load() {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    _cache = JSON.parse(raw);
  } catch (_) {
    _cache = defaultData();
    save(_cache);
    return _cache;
  }
  if (!_cache || typeof _cache !== 'object') _cache = defaultData();
  if (_cache.version === undefined) _cache.version = 1;
  if (!Array.isArray(_cache.groups)) _cache.groups = [];
  if (!_cache.settings || typeof _cache.settings !== 'object') _cache.settings = defaultData().settings;
  if (_cache.settings.openAtLogin === undefined) _cache.settings.openAtLogin = false;
  if (_cache.settings.clipboardMonitor === undefined) _cache.settings.clipboardMonitor = true;
  if (_cache.settings.autoPaste === undefined) _cache.settings.autoPaste = true;
  _cache.settings.keymap = defaultKeymap(_cache.settings.keymap);
  return _cache;
}

function save(data) {
  _cache = data;
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  const tmp = filePath() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath());
}

function getGroups() {
  return load().groups;
}

function createGroup(name) {
  const data = load();
  const maxOrder = data.groups.reduce((m, g) => Math.max(m, g.order), -1);
  const group = { id: id('g'), name: normalizeGroupName(name || '新分组'), order: maxOrder + 1, createdAt: now(), items: [] };
  data.groups.push(group);
  save(data);
  return group;
}

function updateGroup(groupId, patch) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  if (patch.name !== undefined) group.name = normalizeGroupName(patch.name);
  if (patch.order !== undefined) group.order = Number(patch.order);
  save(data);
  return group;
}

function deleteGroup(groupId) {
  const data = load();
  const idx = data.groups.findIndex((g) => g.id === groupId);
  if (idx === -1) throw new Error('Group not found');
  data.groups.splice(idx, 1);
  // 守卫：至少保留一个分组
  if (data.groups.length === 0) {
    data.groups.push({ id: id('g'), name: '默认', order: 0, createdAt: now(), items: [] });
  }
  save(data);
}

function findGroup(groupId) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  return group;
}

function createItem(groupId, text, opts = {}) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Text is empty');
  if (trimmed.length > 10000) throw new Error('Text too long (max 10000)');
  const duplicate = group.items.find((item) => item.text === trimmed);
  if (duplicate) throw new Error('DUPLICATE');
  const item = { id: id('i'), text: trimmed, order: opts.order ?? (group.items.reduce((m, item) => Math.max(m, item.order), -1) + 1), createdAt: now(), updatedAt: now(), lastUsedAt: null };
  group.items.push(item);
  save(data);
  return item;
}

function updateItem(groupId, itemId, patch) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  const item = group.items.find((i) => i.id === itemId);
  if (!item) throw new Error('Item not found');
  if (patch.text !== undefined) {
    const trimmed = String(patch.text).trim();
    if (!trimmed) throw new Error('Text is empty');
    if (trimmed.length > 10000) throw new Error('Text too long');
    const duplicate = group.items.find((i) => i.id !== itemId && i.text === trimmed);
    if (duplicate) throw new Error('DUPLICATE');
    item.text = trimmed;
    item.updatedAt = now();
  }
  if (patch.order !== undefined) item.order = Number(patch.order);
  save(data);
  return item;
}

function deleteItem(groupId, itemId) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  const idx = group.items.findIndex((i) => i.id === itemId);
  if (idx === -1) throw new Error('Item not found');
  group.items.splice(idx, 1);
  save(data);
}

function markUsed(groupId, itemId) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return;
  const item = group.items.find((i) => i.id === itemId);
  if (!item) return;
  item.lastUsedAt = now();
  save(data);
}

function getSettings() {
  const s = load().settings;
  return {
    globalShortcut: s.globalShortcut || 'Ctrl+Alt+V',
    clipboardMonitor: s.clipboardMonitor !== false,
    autoPaste: s.autoPaste !== false,
    openAtLogin: !!s.openAtLogin,
    keymap: defaultKeymap(s.keymap)
  };
}

function updateSettings(patch) {
  const data = load();
  // 过滤 undefined 值
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  // 深合并 keymap
  if (clean.keymap && typeof clean.keymap === 'object') {
    clean.keymap = Object.assign({}, data.settings.keymap, clean.keymap);
  }
  Object.assign(data.settings, clean);
  save(data);
  return data.settings;
}

function normalizeOrder(items) {
  items
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .forEach((item, index) => { item.order = index; });
}

function ensureClipboardGroup() {
  const data = load();
  let clipGroup = data.groups.find((g) => g.name === '剪贴板');
  if (!clipGroup) {
    data.groups.forEach((g) => { g.order = Number(g.order || 0) + 1; });
    clipGroup = { id: id('g'), name: '剪贴板', order: 0, createdAt: now(), items: [] };
    data.groups.push(clipGroup);
    save(data);
  }
  return clipGroup;
}

function upsertClipboardItem(text) {
  const raw = String(text == null ? '' : text);
  if (!raw.trim()) return { changed: false };

  const data = load();
  let clipGroup = data.groups.find((g) => g.name === '剪贴板');
  if (!clipGroup) {
    data.groups.forEach((g) => { g.order = Number(g.order || 0) + 1; });
    clipGroup = { id: id('g'), name: '剪贴板', order: 0, createdAt: now(), items: [] };
    data.groups.push(clipGroup);
  }

  const items = Array.isArray(clipGroup.items) ? clipGroup.items : [];
  clipGroup.items = items;
  normalizeOrder(items);

  let item = items.find((i) => i.text === raw);
  let action = 'moved';
  if (!item) {
    item = { id: id('i'), text: raw, order: 0, createdAt: now(), updatedAt: now(), lastUsedAt: null };
    items.unshift(item);
    action = 'created';
  } else if (item.order === 0) {
    return { changed: false, group: clipGroup, item, action: 'unchanged' };
  } else {
    item.updatedAt = now();
  }

  const reordered = [item, ...items.filter((i) => i.id !== item.id)];
  reordered.forEach((entry, index) => { entry.order = index; });
  clipGroup.items = reordered;
  save(data);
  return { changed: true, group: clipGroup, item, action };
}

function clearClipboardHistory() {
  const data = load();
  const clipGroup = data.groups.find((g) => g.name === '剪贴板');
  if (!clipGroup) return { changed: false };
  if (!Array.isArray(clipGroup.items) || clipGroup.items.length === 0) return { changed: false };
  clipGroup.items = [];
  save(data);
  return { changed: true, group: clipGroup };
}

/** 批量重排条目顺序：orderedIds[0] → order 0, orderedIds[1] → order 1, ... */
function reorderItems(groupId, orderedIds) {
  const data = load();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Group not found');
  const itemMap = new Map(group.items.map((i) => [i.id, i]));
  orderedIds.forEach((itemId, index) => {
    const item = itemMap.get(itemId);
    if (item) item.order = index;
  });
  save(data);
  return group.items;
}

module.exports = {
  getGroups, createGroup, updateGroup, deleteGroup, findGroup,
  createItem, updateItem, deleteItem, markUsed, reorderItems,
  getSettings, updateSettings, filePath,
  ensureClipboardGroup, upsertClipboardItem, clearClipboardHistory
};
