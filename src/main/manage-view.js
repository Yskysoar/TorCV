import state from './renderer-state.js';
import {
  $, listen, esc, getContentArea, showToast, api,
  groupNameError, isClipboardGroup, sortedGroups, selectedGroup, sortedItems,
  clampSelectedItem, iconBtn,
  MAX_GROUP_NAME_LENGTH, ACTION_LABELS,
  currentKeymap, displayKeyName
} from './helpers.js';
import { showModalInput } from './modal.js';
import { bindSortableRows } from './drag.js';
import { scrollManageGroups, scrollManageItems } from './manage-scroll.js';

// ── 渲染函数注入（避免循环依赖） ──────────────────────────────────────────

let _render = null;

/** 由 renderer.js 在初始化时调用，注入 render 函数 */
export function setRenderFn(fn) { _render = fn; }

/**
 * 局部数据刷新：重新拉取分组数据并重新渲染
 * 不修改 mode / manageTab，避免与 renderer.js 产生循环依赖
 */
async function refresh() {
  state.groups = await api.data.getGroups();
  if (!state.selectedGroupId || !state.groups.find((g) => g.id === state.selectedGroupId)) {
    state.selectedGroupId = sortedGroups()[0]?.id || null;
  }
  clampSelectedItem();
  _render();
}

async function moveItemToTop(groupId, itemId) {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group || !itemId) return;
  const orderedIds = [
    itemId,
    ...sortedItems(group)
      .filter((item) => item.id !== itemId)
      .map((item) => item.id)
  ];
  await api.data.reorderItems(groupId, orderedIds);
}

function fitGroupRowsToPage(contentArea) {
  const list = contentArea?.querySelector('#groupManageList');
  if (!list) return;
  const gap = Number.parseFloat(window.getComputedStyle(list).getPropertyValue('--group-row-gap')) || 8;
  const rowHeight = (contentArea.clientHeight - (gap * 6)) / 5;
  list.style.setProperty('--group-row-height', `${rowHeight}px`);
}

// ── 路由分发 ──────────────────────────────────────────────────────────────

export function renderManageView() {
  const contentArea = getContentArea();
  const fixedManagePage = (state.manageTab === 'system' || state.manageTab === 'shortcuts') && !state.editingGroupId;
  contentArea?.classList.toggle('no-scroll', fixedManagePage);
  contentArea?.classList.toggle('group-scroll', state.manageTab === 'groups' && !state.editingGroupId);

  if (state.editingGroupId) {
    renderGroupItemsView(state.editingGroupId);
    return;
  }
  if (state.manageTab === 'system') {
    renderSystemSettings();
  } else if (state.manageTab === 'shortcuts') {
    renderShortcutSettings();
  } else {
    renderGroupSettings();
  }
}

// ── 系统设置页 ────────────────────────────────────────────────────────────

export function renderSystemSettings() {
  const contentArea = getContentArea();
  contentArea.onwheel = null;
  const monitor = state.currentSettings.clipboardMonitor !== false;
  const autoPaste = state.currentSettings.autoPaste !== false;
  const openAtLogin = !!state.currentSettings.openAtLogin;
  const globalAcc = state.currentSettings.globalShortcut || 'Ctrl+Alt+V';

  contentArea.innerHTML = `
    <section class="panel">
      <div class="settings-list">
        <label class="setting-row">
          <span class="setting-copy"><span class="setting-title">开机自启动</span><span class="setting-desc">登录 Windows 后自动运行 TorCV</span></span>
          <input class="setting-check" id="setOpenAtLogin" type="checkbox" ${openAtLogin ? 'checked' : ''}>
          <span class="switch ${openAtLogin ? 'on' : ''}"></span>
        </label>
        <label class="setting-row">
          <span class="setting-copy"><span class="setting-title">剪贴板监听</span><span class="setting-desc">自动保存复制文本到剪贴板分组</span></span>
          <input class="setting-check" id="setClipboardMonitor" type="checkbox" ${monitor ? 'checked' : ''}>
          <span class="switch ${monitor ? 'on' : ''}"></span>
        </label>
        <label class="setting-row">
          <span class="setting-copy"><span class="setting-title">自动粘贴</span><span class="setting-desc">选择条目后发送 Ctrl+V 到目标窗口</span></span>
          <input class="setting-check" id="setAutoPaste" type="checkbox" ${autoPaste ? 'checked' : ''}>
          <span class="switch ${autoPaste ? 'on' : ''}"></span>
        </label>
        <button class="setting-row clear-history-row ${state.confirmingClearClipboard ? 'confirming' : ''}" id="btnClearClipboardHistory">
          <span class="setting-copy"><span class="setting-title">清空剪贴板历史</span><span class="setting-desc">${state.confirmingClearClipboard ? '再次点击确认清空内置剪贴板分组' : '仅清空内置剪贴板，不影响其他分组'}</span></span>
          <span class="danger-action">${state.confirmingClearClipboard ? '确认清空' : '清空'}</span>
        </button>
        <div class="setting-row keymap-row ${state.recordingGlobal ? 'recording' : ''}" id="globalShortcutRow">
          <span class="setting-copy"><span class="setting-title">触发快捷键</span><span class="setting-desc">${state.recordingGlobal ? '按下组合键… Esc 取消' : '点击重新录制'}</span></span>
          <span class="keymap-value">${state.recordingGlobal ? '录制中' : esc(globalAcc)}</span>
        </div>
      </div>
    </section>
  `;

  // 开机自启动：进入页面时同步系统真实状态
  listen('#setOpenAtLogin', 'change', async (e) => {
    const desired = e.target.checked;
    try {
      const res = await api.settings.setLoginItem(desired);
      if (res.error) {
        showToast('设置自启动失败');
        e.target.checked = !desired;
        e.target.nextElementSibling.classList.toggle('on', !desired);
        return;
      }
      state.currentSettings = await api.settings.get();
      e.target.checked = !!res.openAtLogin;
      e.target.nextElementSibling.classList.toggle('on', !!res.openAtLogin);
    } catch (err) {
      showToast('设置自启动失败');
      e.target.checked = !desired;
    }
  });

  listen('#setAutoPaste', 'change', async (e) => {
    state.currentSettings = await api.settings.update({ autoPaste: e.target.checked });
  });

  listen('#setClipboardMonitor', 'change', async (e) => {
    state.currentSettings = await api.settings.update({ clipboardMonitor: e.target.checked });
    state.confirmingClearClipboard = false;
    _render();
  });

  listen('#btnClearClipboardHistory', 'click', async () => {
    if (!state.confirmingClearClipboard) {
      state.confirmingClearClipboard = true;
      clearTimeout(state.clearClipboardTimer);
      state.clearClipboardTimer = setTimeout(() => {
        state.confirmingClearClipboard = false;
        if (state.mode === 'manage' && state.manageTab === 'system') renderSystemSettings();
      }, 4000);
      renderSystemSettings();
      return;
    }
    state.confirmingClearClipboard = false;
    clearTimeout(state.clearClipboardTimer);
    const res = await api.clipboard.clearHistory();
    showToast(res.changed ? '已清空剪贴板历史' : '剪贴板历史为空');
    await refresh();
  });

  // 全局触发快捷键录制入口
  listen('#globalShortcutRow', 'click', () => {
    state.recordingGlobal = true;
    state.recordingAction = null;
    _render();
  });

}

// ── 快捷键设置页 ──────────────────────────────────────────────────────────

export function renderShortcutSettings() {
  const contentArea = getContentArea();
  contentArea.onwheel = null;
  const km = currentKeymap();
  const order = ['up', 'down', 'left', 'right', 'confirm'];

  const keymapRows = order.map((action) => {
    const recording = state.recordingAction === action;
    const value = recording ? '按下新键… Esc 取消' : displayKeyName(km[action]);
    return `
      <div class="setting-row keymap-row ${recording ? 'recording' : ''}" data-keymap-action="${action}">
        <span class="setting-copy"><span class="setting-title">${esc(ACTION_LABELS[action])}</span></span>
        <span class="keymap-value">${esc(value)}</span>
      </div>`;
  }).join('');

  contentArea.innerHTML = `
    <section class="panel">
      <div class="settings-list">${keymapRows}</div>
    </section>
  `;

  contentArea.querySelectorAll('[data-keymap-action]').forEach((row) => {
    row.addEventListener('click', () => {
      state.recordingAction = row.dataset.keymapAction;
      state.recordingGlobal = false;
      _render();
    });
  });

  // 恢复默认快捷键
  listen('#btnResetShortcuts', 'click', async () => {
    const res = await api.settings.resetShortcuts();
    if (res.ok) {
      state.currentSettings = await api.settings.get();
      showToast('已恢复默认快捷键');
      _render();
    } else {
      showToast('恢复失败');
    }
  });
}

// ── 分组管理页 ────────────────────────────────────────────────────────────

export function renderGroupSettings() {
  const contentArea = getContentArea();
  contentArea.onwheel = null;
  // SVG paths: trash
  const trashPath = 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6';
  contentArea.innerHTML = `
    <section class="panel group-manage-panel">
      <div class="manage-list" id="groupManageList">
        ${sortedGroups().map((g) => {
          const isClip = isClipboardGroup(g);
          const isConfirming = g.id === state.confirmingDeleteGroupId;
          return `
          <div class="manage-row${isClip ? ' clipboard-row' : ''}" draggable="true" data-group-id="${esc(g.id)}">
            <span class="drag-handle">⋮⋮</span>
            <span class="manage-name">${esc(g.name)}</span>
            <span class="manage-count">${g.items.length} 条</span>
            ${isClip ? '<span class="clipboard-badge">当前系统剪切板</span>' : iconBtn({ 'data-delete-group': g.id }, trashPath, '删除', 'danger')}
          </div>
          ${isConfirming && !isClip ? `
          <div class="inline-confirm">
            <span>是否确认删除当前分组「${esc(g.name)}」？</span>
            <div class="confirm-actions">
              <button class="confirm-cancel" data-confirm-cancel>取消</button>
              <button class="confirm-ok" data-confirm-ok="${esc(g.id)}">确认</button>
            </div>
          </div>` : ''}`;
        }).join('')}
      </div>
    </section>
  `;
  requestAnimationFrame(() => fitGroupRowsToPage(contentArea));
  listen('#btnAddGroup', 'click', addGroup);

  contentArea.querySelectorAll('[data-delete-group]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.confirmingDeleteGroupId = btn.dataset.deleteGroup;
      _render();
    });
  });
  contentArea.querySelectorAll('[data-confirm-cancel]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.confirmingDeleteGroupId = null;
      _render();
    });
  });
  contentArea.querySelectorAll('[data-confirm-ok]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.confirmingDeleteGroupId = null;
      await api.data.deleteGroup(btn.dataset.confirmOk);
      await refresh();
    });
  });
  contentArea.querySelectorAll('[data-group-id]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn') || e.target.closest('.drag-handle') || e.target.closest('.clipboard-badge')) return;
      if (isClipboardGroup(state.groups.find((g) => g.id === row.dataset.groupId))) return;
      state.editingGroupId = row.dataset.groupId;
      state.confirmingDeleteGroupId = null;
      state.renamingGroup = false;
      state.editingItemId = null;
      _render();
    });
  });
  bindSortableRows('#groupManageList .manage-row', async () => {
    const rows = [...contentArea.querySelectorAll('#groupManageList .manage-row')];
    for (let i = 0; i < rows.length; i++) {
      await api.data.updateGroup(rows[i].dataset.groupId, { order: i });
    }
    await refresh();
  }, contentArea);
}

// ── 条目管理页 ────────────────────────────────────────────────────────────

export function renderGroupItemsView(groupId) {
  const contentArea = getContentArea();
  contentArea.onwheel = (event) => {
    if (!event.target.closest('#itemManageList')) return;
    if (event.target.closest('textarea, input')) return;
    event.preventDefault();
    scrollManageItems(event.deltaY > 0 ? 1 : -1);
  };
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) {
    state.editingGroupId = null;
    state.editingItemId = null;
    state.renamingGroup = false;
    renderGroupSettings();
    return;
  }
  const items = [...group.items].sort((a, b) => a.order - b.order);
  // SVG paths
  const trashPath = 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6';
  const editPath = 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z';
  const plusPath = 'M12 5v14M5 12h14';
  const clipPath = 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M5 10h14M12 10v10';
  const monitor = state.currentSettings.clipboardMonitor !== false;

  const titleHtml = state.renamingGroup
    ? `<input class="rename-input" id="renameGroupInput" value="${esc(group.name)}" maxlength="${MAX_GROUP_NAME_LENGTH}">`
    : `<h1 class="detail-title" id="groupTitle" title="双击重命名">${esc(group.name)}</h1>`;

  contentArea.innerHTML = `
    <section class="panel">
      <div class="detail-head">
        <button class="inline-back" id="backToGroups"><span aria-hidden="true">‹</span> 返回</button>
        ${titleHtml}
        <div class="detail-actions">
          ${iconBtn({ id: 'btnAddItem' }, plusPath, '新增条目')}
          ${iconBtn({ id: 'btnAddFromClipboard', ...(monitor ? {} : { disabled: true }) }, clipPath, monitor ? '从剪切板添加' : '剪贴板监听已关闭')}
        </div>
      </div>
      <div class="manage-list" id="itemManageList">
        ${items.map((item) => {
          const isEditing = state.editingItemId === item.id;
          const textContent = isEditing
            ? `<textarea class="item-edit-input" data-edit-textarea="${esc(item.id)}">${esc(item.text)}</textarea>`
            : `<span class="manage-name item-text">${esc(item.text)}</span>`;
          return `
          <div class="manage-row item-row" draggable="true" data-item-id="${esc(item.id)}">
            <div class="item-left">
              <span class="drag-handle">⋮⋮</span>
              ${textContent}
            </div>
            <div class="item-actions">
              ${iconBtn({ 'data-edit-item': item.id }, editPath, '编辑')}
              ${iconBtn({ 'data-delete-item': item.id }, trashPath, '删除', 'danger')}
            </div>
          </div>`;
        }).join('') || '<div class="empty-state">此分组暂无条目</div>'}
      </div>
    </section>
  `;

  // 返回
  listen('#backToGroups', 'click', () => {
    state.editingGroupId = null;
    state.editingItemId = null;
    state.renamingGroup = false;
    renderGroupSettings();
  });

  // 新增条目（输入框 prompt）
  listen('#btnAddItem', 'click', () => addItemByPrompt(group.id));
  // 从剪切板添加
  if (monitor) listen('#btnAddFromClipboard', 'click', () => addItemFromClipboard(group.id));

  // 分组重命名（剪贴板分组不可重命名）
  const titleEl = $('#groupTitle');
  if (titleEl && !isClipboardGroup(group)) {
    titleEl.addEventListener('dblclick', () => {
      state.renamingGroup = true;
      _render();
    });
  }
  const renameInput = $('#renameGroupInput');
  if (renameInput) {
    renameInput.focus();
    renameInput.select();
    renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRenameGroup(group.id, renameInput.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        state.renamingGroup = false;
        _render();
      }
    });
    renameInput.addEventListener('blur', () => {
      if (state.renamingGroup) commitRenameGroup(group.id, renameInput.value);
    });
  }

  // 条目删除
  contentArea.querySelectorAll('[data-delete-item]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.editingItemId = null;
      await api.data.deleteItem(group.id, btn.dataset.deleteItem);
      await refresh();
    });
  });

  // 条目编辑按钮
  contentArea.querySelectorAll('[data-edit-item]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.editingItemId = btn.dataset.editItem;
      _render();
    });
  });

  // 编辑态 textarea 事件
  contentArea.querySelectorAll('[data-edit-textarea]').forEach((ta) => {
    ta.focus();
    // 光标置尾
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        state.editingItemId = null;
        _render();
        return;
      }
      // Shift+Enter 允许换行，普通 Enter 提交
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitEditItem(group.id, ta.dataset.editTextarea, ta.value);
      }
    });
    ta.addEventListener('blur', () => {
      if (state.editingItemId === ta.dataset.editTextarea) {
        commitEditItem(group.id, ta.dataset.editTextarea, ta.value);
      }
    });
  });

  bindSortableRows('#itemManageList .manage-row', async () => {
    const rows = [...contentArea.querySelectorAll('#itemManageList .manage-row')];
    const editingTextarea = rows.map((row) => row.querySelector('[data-edit-textarea]')).find(Boolean);
    if (editingTextarea) {
      await api.data.updateItem(group.id, editingTextarea.dataset.editTextarea, { text: editingTextarea.value });
    }
    await api.data.reorderItems(group.id, rows.map((row) => row.dataset.itemId));
    await refresh();
  }, contentArea);
}

// ── 提交操作 ──────────────────────────────────────────────────────────────

/** 提交分组重命名 */
export async function commitRenameGroup(groupId, rawValue) {
  const name = String(rawValue || '').trim();
  if (!name) {
    showToast('名称不能为空');
    // 保留输入态，重新聚焦
    setTimeout(() => { const el = $('#renameGroupInput'); if (el) { el.focus(); el.select(); } }, 0);
    return;
  }
  if (name.length > MAX_GROUP_NAME_LENGTH) {
    showToast('分组名最多 4 个字');
    setTimeout(() => { const el = $('#renameGroupInput'); if (el) { el.focus(); el.select(); } }, 0);
    return;
  }
  const current = state.groups.find((g) => g.id === groupId);
  if (current && current.name === name) {
    state.renamingGroup = false;
    _render();
    return;
  }
  state.renamingGroup = false;
  const res = await api.data.updateGroup(groupId, { name });
  if (res && res.ok === false) {
    state.renamingGroup = true;
    showToast(groupNameError(res.error));
    _render();
    return;
  }
  await refresh();
}

/** 提交条目编辑 */
export async function commitEditItem(groupId, itemId, rawValue) {
  const text = String(rawValue || '').trim();
  const current = state.groups.find((g) => g.id === groupId)?.items.find((i) => i.id === itemId);
  if (!text) {
    showToast('内容不能为空');
    setTimeout(() => {
      const el = document.querySelector(`[data-edit-textarea="${CSS.escape(itemId)}"]`);
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    }, 0);
    return;
  }
  if (current && current.text === text) {
    state.editingItemId = null;
    _render();
    return;
  }
  state.editingItemId = null;
  const res = await api.data.updateItem(groupId, itemId, { text });
  if (!res.ok) {
    showToast(res.error === 'DUPLICATE' ? '与同分组其他条目重复' : res.error);
  }
  await refresh();
}

/** 获取条目文本 */
export function getItemText(groupId, itemId) {
  return state.groups.find((g) => g.id === groupId)?.items.find((i) => i.id === itemId)?.text || '';
}

// ── 新增操作 ──────────────────────────────────────────────────────────────

/** 新增分组（弹窗输入名称） */
export async function addGroup() {
  const name = await showModalInput('新分组名称', '新分组', { maxLength: MAX_GROUP_NAME_LENGTH });
  if (!name?.trim()) return;
  const trimmed = name.trim();
  if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
    showToast('分组名最多 4 个字');
    return;
  }
  const res = await api.data.createGroup(trimmed);
  if (res && res.ok === false) {
    showToast(groupNameError(res.error));
    return;
  }
  const group = res.group || res;
  state.selectedGroupId = group.id;
  await refresh();
  state.mode = 'manage';
  state.manageTab = 'groups';
  _render();
}

/** 新增条目（弹窗输入文本） */
export async function addItemByPrompt(groupId) {
  const text = await showModalInput('新条目内容');
  if (!text?.trim()) return;
  const res = await api.data.createItem(groupId, text.trim(), { order: 0 });
  if (!res.ok) {
    showToast(res.error === 'DUPLICATE' ? '此文本已存在' : res.error);
    return;
  }
  await moveItemToTop(groupId, res.item?.id);
  await refresh();
}

/**
 * 从剪贴板添加条目到分组
 * 修复 #10：使用 api.data.reorderItems() 一次性完成排序，替代逐个 updateItem
 */
export async function addItemFromClipboard(groupId) {
  const text = (await api.clipboard.getText()).trim();
  if (!text) {
    showToast('剪切板为空');
    return;
  }
  const res = await api.data.createItem(groupId, text, { order: 0 });
  if (!res.ok) {
    showToast(res.error === 'DUPLICATE' ? '此文本已存在于当前分组' : res.error);
    return;
  }
  await moveItemToTop(groupId, res.item?.id);
  await refresh();
}
