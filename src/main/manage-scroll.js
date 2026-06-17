import { getContentArea } from './helpers.js';
import { VISIBLE_ITEM_COUNT } from './clipboard-view.js';

const MANAGE_SCROLL_BOTTOM_GAP = 8;

function scrollManageList(listSelector, direction, rowsPerStep = VISIBLE_ITEM_COUNT) {
  const contentArea = getContentArea();
  const list = contentArea?.querySelector(listSelector);
  const row = list?.querySelector('.manage-row');
  if (!contentArea || !list || !row) return;

  const listStyle = window.getComputedStyle(list);
  const gap = Number.parseFloat(listStyle.rowGap || listStyle.gap) || 0;
  const rowStep = row.getBoundingClientRect().height + gap;
  const step = rowStep * rowsPerStep;
  const dir = direction > 0 ? 1 : -1;
  const current = contentArea.scrollTop;
  const contentRect = contentArea.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const max = Math.max(0, Math.floor(current + listRect.bottom - contentRect.bottom + MANAGE_SCROLL_BOTTOM_GAP));
  let target = Math.round(current / step) * step + (dir * step);
  target = Math.max(0, Math.min(max, target));
  contentArea.scrollTo({ top: Math.round(target), behavior: 'smooth' });
}

export function scrollManageGroups(direction) {
  scrollManageList('#groupManageList', direction);
}

export function scrollManageItems(direction) {
  scrollManageList('#itemManageList', direction, 1);
}
