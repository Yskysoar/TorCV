import state from './renderer-state.js';

/**
 * 为匹配选择器的行元素绑定拖拽排序行为
 * @param {string} selector   行元素选择器，如 '#groupManageList .manage-row'
 * @param {Function} onDrop   拖放完成后的异步回调
 * @param {Element} container 容器元素（原闭包中的 contentArea）
 */
export function bindSortableRows(selector, onDrop, container) {
  container.querySelectorAll(selector).forEach((row) => {
    row.addEventListener('dragstart', () => {
      state.dragState = row;
      row.style.opacity = '0.55';
    });
    row.addEventListener('dragend', async () => {
      row.style.opacity = '';
      state.dragState = null;
      await onDrop();
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (!state.dragState || state.dragState === row) return;
      const box = row.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      row.parentNode.insertBefore(state.dragState, after ? row.nextSibling : row);
    });
  });
}
