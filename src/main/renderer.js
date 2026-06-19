import state from './renderer-state.js';
import {
  api, listen, esc, getContentArea, getTopStrip,
  sortedGroups, clampSelectedItem
} from './helpers.js';
import {
  renderClipboardView,
  pasteSelectedItem,
  resetLayoutMetrics
} from './clipboard-view.js';
import {
  renderManageView,
  renderShortcutSettings,
  renderSystemSettings,
  setRenderFn
} from './manage-view.js';
import { scrollManageGroups } from './manage-scroll.js';
import { initKeyboardHandler } from './shortcuts.js';

function renderClipboard() {
  renderClipboardView({
    onSelect: () => renderClipboard(),
    onPaste: () => pasteSelectedItem()
  });
}

export async function refresh() {
  state.groups = await api.data.getGroups();
  if (!state.selectedGroupId || !state.groups.find((g) => g.id === state.selectedGroupId)) {
    state.selectedGroupId = sortedGroups()[0]?.id || null;
  }
  clampSelectedItem();
  render();
}

export function render() {
  renderTopStrip();
  if (state.mode === 'clipboard') {
    renderClipboard();
  } else {
    renderManageView();
  }
}

function switchManageTab(tab) {
  if (state.manageTab === tab) return;
  resetContentScroll();
  state.manageTab = tab;
  state.editingGroupId = null;
  state.recordingAction = null;
  state.recordingGlobal = false;
  render();
}

function resetContentScroll() {
  const contentArea = getContentArea();
  if (contentArea) contentArea.scrollTop = 0;
}

export function openClipboardPanel() {
  const firstGroup = sortedGroups()[0] || null;
  state.mode = 'clipboard';
  state.selectedGroupId = firstGroup ? firstGroup.id : null;
  state.selectedItemIndex = 0;
  state.editingGroupId = null;
  state.renamingGroup = false;
  state.editingItemId = null;
  state.recordingAction = null;
  state.recordingGlobal = false;
  state.confirmingDeleteGroupId = null;
  state.confirmingClearClipboard = false;
  clearTimeout(state.clearClipboardTimer);
  resetContentScroll();
  render();
}

export function openSettingsPanel() {
  state.mode = 'manage';
  state.manageTab = 'system';
  state.editingGroupId = null;
  state.renamingGroup = false;
  state.editingItemId = null;
  state.recordingAction = null;
  state.recordingGlobal = false;
  state.confirmingDeleteGroupId = null;
  render();
}

export function renderTopStrip() {
  const topStrip = getTopStrip();
  if (!topStrip) return;

  if (state.mode === 'clipboard') {
    topStrip.innerHTML = `
      <div class="strip-tabs">
        ${sortedGroups().map((g) => `
          <button class="strip-tab ${g.id === state.selectedGroupId ? 'active' : ''}" data-group-id="${esc(g.id)}">${esc(g.name)}</button>
        `).join('')}
      </div>
      <button class="gear-btn" id="manageToggle" title="进入管理" aria-label="进入管理">
        <svg class="gear-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"></path>
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.06a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.06A1.7 1.7 0 0 0 4.62 8.94a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.01V3a2 2 0 0 1 4 0v.06a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 0 1 0 4h-.06A1.7 1.7 0 0 0 19.4 15Z"></path>
        </svg>
      </button>
    `;
    topStrip.querySelectorAll('[data-group-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedGroupId = btn.dataset.groupId;
        state.selectedItemIndex = 0;
        resetContentScroll();
        render();
      });
    });
    listen('#manageToggle', 'click', () => {
      state.mode = 'manage';
      state.manageTab = 'system';
      state.editingGroupId = null;
      render();
    });
    scrollSelectedGroupIntoView();
    return;
  }

  topStrip.innerHTML = `
    <button class="strip-tab ${state.manageTab === 'system' ? 'active' : ''}" data-manage-tab="system">系统</button>
    <button class="strip-tab ${state.manageTab === 'shortcuts' ? 'active' : ''}" data-manage-tab="shortcuts">快捷键</button>
    <button class="strip-tab ${state.manageTab === 'groups' ? 'active' : ''}" data-manage-tab="groups">分组</button>
    ${state.manageTab === 'shortcuts' ? '<button class="icon-btn top-action-btn" id="btnResetShortcuts" title="恢复默认快捷键" aria-label="恢复默认快捷键"><svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg></button>' : ''}
    ${state.manageTab === 'groups' ? '<button class="icon-btn top-add-group" id="btnAddGroup" title="新增分组" aria-label="新增分组"><svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>' : ''}
    <button class="back-btn" id="backToClipboard" title="返回剪贴板" aria-label="返回剪贴板">
      <span aria-hidden="true">‹</span>
    </button>
  `;
  topStrip.querySelectorAll('[data-manage-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchManageTab(btn.dataset.manageTab));
  });
  listen('#backToClipboard', 'click', () => {
    state.mode = 'clipboard';
    state.editingGroupId = null;
    state.selectedItemIndex = 0;
    resetContentScroll();
    render();
  });
}

function scrollSelectedGroupIntoView() {
  requestAnimationFrame(() => {
    const topStrip = getTopStrip();
    const tabs = topStrip?.querySelector('.strip-tabs');
    const active = tabs?.querySelector('.strip-tab.active');
    if (!tabs || !active) return;

    const tabsBox = tabs.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    if (activeBox.left < tabsBox.left) {
      tabs.scrollLeft -= tabsBox.left - activeBox.left;
    } else if (activeBox.right > tabsBox.right) {
      tabs.scrollLeft += activeBox.right - tabsBox.right;
    }
  });
}

function bindIpcEvents() {
  const disposers = [
    api.on('ct:dataChanged', (d) => {
      state.groups = d.groups || [];
      if (!state.selectedGroupId || !state.groups.find((g) => g.id === state.selectedGroupId)) {
        state.selectedGroupId = sortedGroups()[0]?.id || null;
      }
      clampSelectedItem();
      render();
    }),
    api.on('ct:clipboardUpdate', (d) => {
      state.clipboardText = d.text || '';
      if (state.mode === 'clipboard') renderClipboard();
    }),
    api.on('ct:settingsChanged', (d) => {
      state.currentSettings = d.settings || {};
      if (state.mode === 'manage' && state.manageTab === 'system') renderSystemSettings();
      if (state.mode === 'manage' && state.manageTab === 'shortcuts') renderShortcutSettings();
    }),
    api.on('ct:openClipboard', openClipboardPanel),
    api.on('ct:openSettings', openSettingsPanel)
  ];
  return () => disposers.forEach((dispose) => dispose());
}

function bindWindowEvents() {
  listen('#btnClose', 'click', () => api.window.closePanel());

  const contentArea = getContentArea();
  contentArea?.addEventListener('wheel', (e) => {
    if (!(state.mode === 'manage' && state.manageTab === 'groups')) return;
    e.preventDefault();
    scrollManageGroups(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  window.addEventListener('resize', resetLayoutMetrics);
}

function installErrorBoundary() {
  const showFatal = (err) => {
    console.error('renderer error:', err);
    const message = err?.message || String(err || '未知错误');
    document.body.innerHTML = `<div class="fatal-error">运行错误: ${esc(message)}</div>`;
  };

  window.addEventListener('error', (event) => {
    showFatal(event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    showFatal(event.reason);
  });
}

async function init() {
  if (!window.clipTabs) {
    console.error('clipTabs API not available');
    return;
  }

  setRenderFn(render);
  installErrorBoundary();

  state.currentSettings = await api.settings.get();
  state.clipboardText = await api.clipboard.getText();
  await refresh();

  const disposeIpc = bindIpcEvents();
  bindWindowEvents();
  const disposeKeyboard = initKeyboardHandler({
    render,
    renderClipboard,
    pasteSelectedItem
  });

  const readyState = await api.window.rendererReady();
  if (readyState?.openSettings) openSettingsPanel();
  else if (readyState?.openClipboard) openClipboardPanel();

  window.addEventListener('beforeunload', () => {
    clearTimeout(state.clearClipboardTimer);
    clearTimeout(state.toastTimer);
    disposeIpc();
    disposeKeyboard();
  });
}

init().catch((err) => {
  console.error('init failed:', err);
  document.body.innerHTML = `<div class="fatal-error">启动错误: ${esc(err?.message || err)}</div>`;
});
