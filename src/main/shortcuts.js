import state from './renderer-state.js';
import {
  api,
  ACTION_LABELS,
  currentKeymap,
  equalsKey,
  normalizeKey,
  isValidMapKey,
  showToast,
  getContentArea,
  sortedGroups,
  sortedItems
} from './helpers.js';
import { scrollToSelected } from './clipboard-view.js';
import { scrollManageGroups } from './manage-scroll.js';

let _render = null;
let _renderClipboard = null;
let _pasteSelectedItem = null;
const MANAGE_TABS = ['system', 'shortcuts', 'groups'];

export function initKeyboardHandler(callbacks) {
  _render = callbacks.render;
  _renderClipboard = callbacks.renderClipboard;
  _pasteSelectedItem = callbacks.pasteSelectedItem;

  document.addEventListener('keydown', handleKeydown, true);
  return () => document.removeEventListener('keydown', handleKeydown, true);
}

async function handleKeydown(event) {
  if (state.recordingGlobal || state.recordingAction) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      state.recordingGlobal = false;
      state.recordingAction = null;
      _render();
      return;
    }
    if (state.recordingGlobal) {
      await handleGlobalRecording(event);
    } else {
      await handleKeymapRecording(event);
    }
    return;
  }

  const activeElement = document.activeElement;
  const inEditor = activeElement
    && (activeElement.id === 'renameGroupInput'
      || activeElement.classList.contains('item-edit-input')
      || activeElement.id === 'modalInput');
  if (inEditor) return;

  const keymap = currentKeymap();
  const key = normalizeKey(event);

  if (state.mode !== 'clipboard') {
    if (event.key === 'Escape') {
      event.preventDefault();
      state.mode = 'clipboard';
      state.editingGroupId = null;
      _render();
    } else if (state.manageTab === 'groups' && !state.editingGroupId && equalsKey(key, keymap.up)) {
      event.preventDefault();
      scrollManageGroups(-1);
    } else if (state.manageTab === 'groups' && !state.editingGroupId && equalsKey(key, keymap.down)) {
      event.preventDefault();
      scrollManageGroups(1);
    } else if (equalsKey(key, keymap.left)) {
      event.preventDefault();
      moveManageTab(-1);
    } else if (equalsKey(key, keymap.right)) {
      event.preventDefault();
      moveManageTab(1);
    }
    return;
  }

  const items = sortedItems();

  if (event.key === 'Escape') {
    event.preventDefault();
    api.window.closePanel();
  } else if (equalsKey(key, keymap.up)) {
    event.preventDefault();
    const previous = state.selectedItemIndex;
    state.selectedItemIndex = Math.max(0, state.selectedItemIndex - 1);
    _renderClipboard();
    scrollToSelected(state.selectedItemIndex, items.length, state.selectedItemIndex - previous);
  } else if (equalsKey(key, keymap.down)) {
    event.preventDefault();
    const previous = state.selectedItemIndex;
    state.selectedItemIndex = Math.min(Math.max(0, items.length - 1), state.selectedItemIndex + 1);
    _renderClipboard();
    scrollToSelected(state.selectedItemIndex, items.length, state.selectedItemIndex - previous);
  } else if (equalsKey(key, keymap.left)) {
    event.preventDefault();
    moveGroup(-1);
  } else if (equalsKey(key, keymap.right)) {
    event.preventDefault();
    moveGroup(1);
  } else if (equalsKey(key, keymap.confirm) || event.key === 'Enter') {
    event.preventDefault();
    await _pasteSelectedItem();
  }
}

function moveManageTab(delta) {
  const index = MANAGE_TABS.indexOf(state.manageTab);
  const next = Math.max(0, Math.min(MANAGE_TABS.length - 1, index + delta));
  if (next === index) return;
  state.manageTab = MANAGE_TABS[next];
  state.editingGroupId = null;
  state.renamingGroup = false;
  state.editingItemId = null;
  state.recordingAction = null;
  state.recordingGlobal = false;
  const contentArea = getContentArea();
  if (contentArea) contentArea.scrollTop = 0;
  _render();
}

export function moveGroup(delta) {
  const groups = sortedGroups();
  const index = groups.findIndex((g) => g.id === state.selectedGroupId);
  if (index < 0) return;
  const next = Math.max(0, Math.min(groups.length - 1, index + delta));
  state.selectedGroupId = groups[next]?.id || state.selectedGroupId;
  state.selectedItemIndex = 0;
  _render();
}

export async function handleGlobalRecording(event) {
  const mods = [];
  if (event.ctrlKey) mods.push('Ctrl');
  if (event.altKey) mods.push('Alt');
  if (event.shiftKey) mods.push('Shift');
  if (event.metaKey) mods.push('Super');
  const main = normalizeKey(event);

  if (!main) {
    if (mods.length === 0) showToast('需修饰键 + 主键');
    return;
  }
  if (mods.length === 0) {
    showToast('需修饰键 + 主键');
    return;
  }

  const mainMap = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  const accelerator = [...mods, mainMap[main] || main].join('+');
  state.recordingGlobal = false;
  const res = await api.settings.setGlobalShortcut(accelerator);
  if (res.ok) {
    state.currentSettings = await api.settings.get();
    showToast('已更新触发快捷键');
  } else {
    showToast(res.error || '录制失败');
  }
  _render();
}

export async function handleKeymapRecording(event) {
  const action = state.recordingAction;
  const key = normalizeKey(event);
  if (!key) {
    showToast('该键不可用');
    return;
  }
  if (!isValidMapKey(key)) {
    showToast('该键不可用（修饰/Tab/Esc/空格）');
    return;
  }

  const keymap = currentKeymap();
  for (const actionName of Object.keys(keymap)) {
    if (actionName !== action && equalsKey(keymap[actionName], key)) {
      showToast(`与「${ACTION_LABELS[actionName]}」冲突`);
      return;
    }
  }
  state.recordingAction = null;
  const next = { ...keymap, [action]: key };
  state.currentSettings = await api.settings.update({ keymap: next });
  _render();
}
