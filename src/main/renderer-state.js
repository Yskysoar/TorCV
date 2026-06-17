// 渲染进程共享状态
const state = {
  groups: [],
  selectedGroupId: null,
  clipboardText: '',
  currentSettings: {},
  mode: 'clipboard',           // clipboard | manage
  manageTab: 'system',         // system | shortcuts | groups
  editingGroupId: null,
  selectedItemIndex: 0,
  toastTimer: null,
  dragState: null,
  recordingAction: null,       // 'up'|'down'|'left'|'right'|'confirm'|null
  recordingGlobal: false,      // 是否正在录制全局触发快捷键
  renamingGroup: false,        // 分组标题重命名态
  editingItemId: null,         // 正在编辑的条目 id
  confirmingDeleteGroupId: null, // 正在确认删除的分组 id
  confirmingClearClipboard: false, // 正在确认清空剪贴板历史
  clearClipboardTimer: null,
  layoutMetricsLogged: false,
};

export default state;
