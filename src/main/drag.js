import state from './renderer-state.js';

const EDGE_SCROLL_ZONE = 48;
const EDGE_SCROLL_STEP = 12;
const EDGE_SCROLL_INTERVAL = 16;

/**
 * 为匹配选择器的行元素绑定拖拽排序行为
 * @param {string} selector   行元素选择器，如 '#groupManageList .manage-row'
 * @param {Function} onDrop   拖放完成后的异步回调
 * @param {Element} container 容器元素（原闭包中的 contentArea）
 */
export function bindSortableRows(selector, onDrop, container) {
  let lastDragY = 0;
  let scrollTimer = null;

  const stopEdgeScroll = () => {
    if (!scrollTimer) return;
    window.clearInterval(scrollTimer);
    scrollTimer = null;
  };

  const startEdgeScroll = () => {
    if (scrollTimer) return;
    scrollTimer = window.setInterval(() => {
      if (!state.dragState || !lastDragY) {
        stopEdgeScroll();
        return;
      }

      const box = container.getBoundingClientRect();
      const topDistance = lastDragY - box.top;
      const bottomDistance = box.bottom - lastDragY;
      if (topDistance >= 0 && topDistance < EDGE_SCROLL_ZONE) {
        container.scrollTop = Math.max(0, container.scrollTop - EDGE_SCROLL_STEP);
      } else if (bottomDistance >= 0 && bottomDistance < EDGE_SCROLL_ZONE) {
        container.scrollTop = Math.min(
          container.scrollHeight - container.clientHeight,
          container.scrollTop + EDGE_SCROLL_STEP
        );
      }
    }, EDGE_SCROLL_INTERVAL);
  };

  container.querySelectorAll(selector).forEach((row) => {
    row.addEventListener('dragstart', (event) => {
      state.dragState = row;
      lastDragY = event.clientY || 0;
      row.style.opacity = '0.55';
      startEdgeScroll();
    });
    row.addEventListener('dragend', async () => {
      row.style.opacity = '';
      state.dragState = null;
      lastDragY = 0;
      stopEdgeScroll();
      await onDrop();
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      lastDragY = event.clientY;
      startEdgeScroll();
      if (!state.dragState || state.dragState === row) return;
      const box = row.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      row.parentNode.insertBefore(state.dragState, after ? row.nextSibling : row);
    });
  });
}
