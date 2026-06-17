import state from './renderer-state.js';
import {
  $, esc, listen, getContentArea,
  sortedItems, sortedGroups, selectedGroup,
  clampSelectedItem, showToast, api
} from './helpers.js';

// ── 常量 ──────────────────────────────────────────────────────────────────

/** 剪贴板视图一次可见的条目数 */
export const VISIBLE_ITEM_COUNT = 3;

/** fallback 值，实际运行时通过 DOM 测量覆盖（80px card + 15px list gap） */
export const CLIP_ITEM_STEP = 95;

// ── 渲染 ──────────────────────────────────────────────────────────────────

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
  contentArea.innerHTML = `
    <section class="panel">
      <div class="clip-list" id="clipList">
        ${items.length ? items.map((item, index) => `
          <article class="clip-card ${index === state.selectedItemIndex ? 'selected' : ''}" data-item-id="${esc(item.id)}">
            <p class="clip-text">${esc(item.text)}</p>
          </article>
        `).join('') : '<div class="empty-state">此分组暂无条目</div>'}
      </div>
    </section>
  `;
  contentArea.querySelectorAll('[data-item-id]').forEach((card, index) => {
    card.addEventListener('click', () => {
      state.selectedItemIndex = index;
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
  if (totalItems <= VISIBLE_ITEM_COUNT) return;
  requestAnimationFrame(() => {
    const contentArea = getContentArea();
    if (!contentArea) return;
    const list = $('#clipList');
    const firstCard = list?.querySelector('.clip-card');
    const selectedCard = list?.querySelector('.clip-card.selected');
    if (!firstCard || !selectedCard) return;

    const listStyle = window.getComputedStyle(list);
    const gap = Number.parseFloat(listStyle.rowGap || listStyle.gap) || 0;
    const measuredStep = firstCard.getBoundingClientRect().height + gap;
    const itemStep = Number.isFinite(measuredStep) && measuredStep > 0 ? Math.max(measuredStep, CLIP_ITEM_STEP) : CLIP_ITEM_STEP;

    // 从当前 scrollTop 反推窗口起始行号
    const currentWindowStart = Math.round(contentArea.scrollTop / itemStep);
    const maxWindowStart = totalItems - VISIBLE_ITEM_COUNT;

    // 新 selectedIndex 在当前窗口内的位置
    const posInWindow = selectedIndex - currentWindowStart;

    let newWindowStart;
    if (posInWindow < 0) {
      // 超出顶部 -> 窗口上移，选中在新窗口顶部
      newWindowStart = selectedIndex;
    } else if (posInWindow >= VISIBLE_ITEM_COUNT) {
      // 超出底部 -> 窗口下移，选中在新窗口底部
      newWindowStart = selectedIndex - VISIBLE_ITEM_COUNT + 1;
    } else {
      // 在窗口内 -> 不滚动
      newWindowStart = currentWindowStart;
    }

    // clamp 边界
    newWindowStart = Math.max(0, Math.min(maxWindowStart, newWindowStart));
    contentArea.scrollTop = Math.round(newWindowStart * itemStep);
  });
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
