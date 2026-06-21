import state from './renderer-state.js';
import {
  esc, listen, getContentArea,
  sortedItems, sortedGroups, selectedGroup,
  clampSelectedItem, showToast, api
} from './helpers.js';

// ── 常量 ──────────────────────────────────────────────────────────────────

/** 剪贴板视图一次可见的条目数 */
export const VISIBLE_ITEM_COUNT = 3;

// ── 渲染 ──────────────────────────────────────────────────────────────────

function visibleItemWindow(items, selectedIndex) {
  if (items.length <= VISIBLE_ITEM_COUNT) {
    return items.map((item, index) => ({ item, index }));
  }

  const maxStart = items.length - VISIBLE_ITEM_COUNT;
  const start = Math.max(0, Math.min(maxStart, selectedIndex - 1));
  return items.slice(start, start + VISIBLE_ITEM_COUNT).map((item, offset) => ({ item, index: start + offset }));
}

/**
 * 渲染剪贴板视图
 * @param {Object} callbacks  { onSelect: Function, onPaste: Function }
 */
export function renderClipboardView(callbacks = {}) {
  const { onSelect, onPaste } = callbacks;
  const contentArea = getContentArea();
  if (!contentArea) return;
  const group = selectedGroup();
  if (!group) {
    contentArea.innerHTML = '<div class="empty-state">暂无分组</div>';
    return;
  }
  const items = sortedItems(group);
  clampSelectedItem();
  const visibleItems = visibleItemWindow(items, state.selectedItemIndex);
  contentArea.innerHTML = `
    <section class="panel">
      <div class="clip-list" id="clipList">
        ${visibleItems.length ? visibleItems.map(({ item, index }) => `
          <article class="clip-card ${index === state.selectedItemIndex ? 'selected' : ''}" data-item-id="${esc(item.id)}">
            <p class="clip-text">${esc(item.text)}</p>
          </article>
        `).join('') : '<div class="empty-state">此分组暂无条目</div>'}
      </div>
    </section>
  `;
  contentArea.querySelectorAll('[data-item-id]').forEach((card, index) => {
    card.addEventListener('click', () => {
      state.selectedItemIndex = visibleItems[index]?.index ?? state.selectedItemIndex;
      if (onSelect) onSelect();
    });
    card.addEventListener('dblclick', () => {
      if (onPaste) onPaste();
    });
  });
  logClipboardLayoutMetrics();
}

// ── 滚动 ──────────────────────────────────────────────────────────────────

/**
 * 选中条目自动滚动：对称滑动窗口，仅在新条目超出窗口时才滑动
 * @param {number} selectedIndex 当前选中索引
 * @param {number} totalItems    条目总数
 * @param {number} delta         方向（正 = 向下，负 = 向上）
 */
export function scrollToSelected(selectedIndex, totalItems, delta) {
  // 三槽位固定渲染不需要滚动 DOM；保留导出兼容键盘处理调用。
}

// ── 粘贴 ──────────────────────────────────────────────────────────────────

/** 粘贴当前选中条目到目标窗口 */
export async function pasteSelectedItem() {
  if (state.mode !== 'clipboard') return;
  const group = selectedGroup();
  const item = sortedItems(group)[state.selectedItemIndex];
  if (!group || !item) return;
  const res = await api.clipboard.pasteItem(item.text, group.id, item.id);
  if (res && !res.ok && res.error === 'TARGET_FOCUS_FAILED') {
    showToast('目标窗口未获得焦点，已复制到剪贴板');
  }
}

// ── 布局日志 ──────────────────────────────────────────────────────────────

/** 首次渲染时输出布局度量信息（仅执行一次） */
export function logClipboardLayoutMetrics() {
  if (state.layoutMetricsLogged) return;
  requestAnimationFrame(() => {
    const contentArea = getContentArea();
    if (!contentArea) return;
    const list = $('#clipList');
    const firstCard = list?.querySelector('.clip-card');
    if (!list || !firstCard) return;
    state.layoutMetricsLogged = true;

    const contentStyle = window.getComputedStyle(contentArea);
    const listStyle = window.getComputedStyle(list);
    const cardHeight = firstCard.getBoundingClientRect().height;
    const gap = Number.parseFloat(listStyle.rowGap || listStyle.gap) || 0;
    const paddingTop = Number.parseFloat(contentStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(contentStyle.paddingBottom) || 0;
    const needed = (cardHeight * VISIBLE_ITEM_COUNT) + (gap * (VISIBLE_ITEM_COUNT - 1)) + paddingTop + paddingBottom + 4;

    console.log('[layout] clipboard metrics', JSON.stringify({
      devicePixelRatio: window.devicePixelRatio,
      windowInnerHeight: window.innerHeight,
      contentClientHeight: contentArea.clientHeight,
      contentPaddingTop: paddingTop,
      contentPaddingBottom: paddingBottom,
      cardHeight,
      gap,
      footerHeight: 0,
      neededForThreeItems: needed,
      spareHeight: contentArea.clientHeight - needed
    }));
  });
}

/**
 * 重置布局度量标记（窗口 resize 时调用）
 * 修复 #18
 */
export function resetLayoutMetrics() {
  state.layoutMetricsLogged = false;
}
