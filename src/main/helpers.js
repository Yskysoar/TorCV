import state from './renderer-state.js';

// ── API 引用 ──────────────────────────────────────────────────────────────
export const api = window.clipTabs;

// ── 常量 ──────────────────────────────────────────────────────────────────

/** 默认 keymap，用作兜底 */
export const DEFAULT_KEYMAP = { up: 'W', down: 'S', left: 'A', right: 'D', confirm: 'F' };

export const MAX_GROUP_NAME_LENGTH = 4;

/** keymap 动作的中文标签 */
export const ACTION_LABELS = {
  up: '上一项', down: '下一项', left: '上一分组', right: '下一分组', confirm: '确认/粘贴'
};

// ── DOM 工具 ──────────────────────────────────────────────────────────────

export const $ = (s) => document.querySelector(s);

export function getContentArea() { return $('#contentArea'); }
export function getTopStrip() { return $('#topStrip'); }

/**
 * 安全事件绑定：target 可以是选择器字符串或 DOM 元素
 * @param {string|Element} target
 * @param {string} event
 * @param {Function} handler
 * @returns {Element|null}
 */
export function listen(target, event, handler) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) el.addEventListener(event, handler);
  return el;
}

/** HTML 转义 */
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

/** Toast 提示 */
export function showToast(msg, ms = 2000) {
  const toast = $('#toast');
  if (!toast) return;
  const text = String(msg || '').trim();
  if (!text) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.textContent = '';
  }, ms);
}

// ── 分组 / 条目工具 ───────────────────────────────────────────────────────

/** 错误码翻译 */
export function groupNameError(error) {
  if (error === 'GROUP_NAME_EMPTY') return '名称不能为空';
  if (error === 'GROUP_NAME_TOO_LONG') return '分组名最多 4 个字';
  return error || '操作失败';
}

/** 判断是否为内置剪贴板分组 */
export function isClipboardGroup(group) {
  return group.name === '剪贴板';
}

/** 按 order 排序的分组列表 */
export function sortedGroups() {
  return [...state.groups].sort((a, b) => a.order - b.order);
}

/** 获取当前选中的分组（带兜底逻辑） */
export function selectedGroup() {
  return state.groups.find((g) => g.id === state.selectedGroupId)
    || sortedGroups().filter((g) => !isClipboardGroup(g))[0]
    || sortedGroups()[0]
    || null;
}

/** 按 order 排序的条目列表 */
export function sortedItems(group = selectedGroup()) {
  return group ? [...group.items].sort((a, b) => a.order - b.order) : [];
}

/** 约束 selectedItemIndex 在有效范围内 */
export function clampSelectedItem() {
  const items = sortedItems();
  if (state.selectedItemIndex >= items.length) state.selectedItemIndex = Math.max(0, items.length - 1);
  if (state.selectedItemIndex < 0) state.selectedItemIndex = 0;
}

// ── SVG 图标按钮 ──────────────────────────────────────────────────────────

/**
 * 通用 SVG 图标按钮
 * 修复 #13：签名改为 (dataAttrs, svgPath, title, extraClass)
 * @param {Object} dataAttrs  属性键值对，如 { id: 'btnAddItem' } 或 { 'data-delete-group': g.id }
 * @param {string} svgPath    SVG path d 属性
 * @param {string} title      按钮标题（无障碍）
 * @param {string} extraClass 额外 CSS 类名
 * @returns {string} HTML 字符串
 */
export function iconBtn(dataAttrs, svgPath, title, extraClass = '') {
  const attrs = Object.entries(dataAttrs)
    .filter(([, v]) => v != null)
    .map(([k, v]) => v === true ? esc(k) : `${esc(k)}="${esc(String(v))}"`)
    .join(' ');
  return `<button class="icon-btn ${extraClass}" ${attrs} title="${esc(title)}" aria-label="${esc(title)}">
    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${svgPath}"></path></svg>
  </button>`;
}

// ── 快捷键工具 ────────────────────────────────────────────────────────────

/**
 * 判断键名是否为功能键（F1-F24）
 * 修复 #19：提取为共用函数，normalizeKey 和 isValidMapKey 共用
 */
export function isFKeyName(name) {
  return /^F([1-9]|1[0-9]|2[0-4])$/.test(name);
}

/** 把 KeyboardEvent 归一化为可存储的键名；不可用键返回 null */
export function normalizeKey(e) {
  if (e.key === 'ArrowUp') return 'ArrowUp';
  if (e.key === 'ArrowDown') return 'ArrowDown';
  if (e.key === 'ArrowLeft') return 'ArrowLeft';
  if (e.key === 'ArrowRight') return 'ArrowRight';
  if (e.key && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) return e.key.toUpperCase();
  if (e.key && isFKeyName(e.key)) return e.key;
  return null;
}

/** 判断键名是否可作为 keymap 映射键 */
export function isValidMapKey(name) {
  if (!name) return false;
  if (name === 'Enter' || name === 'Escape' || name === 'Tab' || name === ' ') return false;
  if (name.length === 1 && /[a-zA-Z0-9]/.test(name)) return true;
  if (/^Arrow(Up|Down|Left|Right)$/.test(name)) return true;
  if (isFKeyName(name)) return true;
  return false;
}

/** 大小写无关比较两个键名 */
export function equalsKey(a, b) {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

/** 取当前生效 keymap（注入默认值兜底） */
export function currentKeymap() {
  return Object.assign({}, DEFAULT_KEYMAP, (state.currentSettings.keymap || {}));
}

/** 把存储键名转为展示文本 */
export function displayKeyName(name) {
  if (!name) return '—';
  const map = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  return map[name] || name;
}
