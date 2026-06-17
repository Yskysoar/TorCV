import { esc } from './helpers.js';

/**
 * 显示一个 HTML 模态输入框，返回用户输入的文本（取消则返回 null）
 * @param {string} promptText   提示文本
 * @param {string} defaultValue 默认值
 * @param {Object} opts         选项，如 { maxLength: 4 }
 * @returns {Promise<string|null>}
 */
export function showModalInput(promptText, defaultValue = '', opts = {}) {
  return new Promise((resolve) => {
    // 若已有模态框则不重复创建
    if (document.getElementById('modalOverlay')) {
      resolve(null);
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <label class="modal-label" id="modalLabel">${esc(promptText)}</label>
        <input class="modal-input" id="modalInput" type="text" value="${esc(defaultValue)}" placeholder="${esc(defaultValue)}"${opts.maxLength ? ` maxlength="${Number(opts.maxLength)}"` : ''}>
        <div class="modal-actions">
          <button class="modal-cancel" id="modalCancel">取消</button>
          <button class="modal-ok" id="modalOk">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#modalInput');
    const modalOk = overlay.querySelector('#modalOk');
    const modalCancel = overlay.querySelector('#modalCancel');
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    modalOk.addEventListener('click', () => close(input.value || null));
    modalCancel.addEventListener('click', () => close(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); close(input.value || null); }
      else if (e.key === 'Escape') { e.preventDefault(); close(null); }
    });
    input.focus();
    input.select();
    // 聚焦保护：确保 input 获得焦点
    requestAnimationFrame(() => input.focus());
  });
}
