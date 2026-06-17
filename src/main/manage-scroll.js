import { getContentArea } from './helpers.js';
import { VISIBLE_ITEM_COUNT } from './clipboard-view.js';

const MANAGE_SCROLL_BOTTOM_GAP = 8;

export function scrollManageGroups(direction) {
  const contentArea = getContentArea();
  const list = contentArea?.querySelector('#groupManageList');
  const row = list?.querySelector('.manage-row');
  if (!contentArea || !list || !row) return;

  const listStyle = window.getComputedStyle(list);
  const gap = Number.parseFloat(listStyle.rowGap || listStyle.gap) || 0;
  const rowStep = row.getBoundingClientRect().height + gap;
  const step = rowStep * VISIBLE_ITEM_COUNT;
  const dir = direction > 0 ? 1 : -1;
  const current = contentArea.scrollTop;
  const contentRect = contentArea.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const max = Math.max(0, Math.floor(current + listRect.bottom - contentRect.bottom + MANAGE_SCROLL_BOTTOM_GAP));
  let target = Math.round(current / step) * step + (dir * step);
  target = Math.max(0, Math.min(max, target));
  contentArea.scrollTo({ top: Math.round(target), behavior: 'smooth' });
}
