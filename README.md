<div align="center">
  <h1>
    TorCV
  </h1>

  <p align="center">
    <img src="src/icon.png" alt="TorCV icon" width="128">
  </p>

  <p align="center">
    <a href="https://github.com/Yskysoar/TorCV"><img src="https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge" alt="Platform"></a>
    <a href="https://github.com/Yskysoar/TorCV/blob/main/package.json"><img src="https://img.shields.io/badge/Electron-42-47848F?style=for-the-badge" alt="Electron"></a>
    <a href="https://github.com/Yskysoar/TorCV/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/Yskysoar/TorCV/stargazers"><img src="https://img.shields.io/github/stars/Yskysoar/TorCV?style=for-the-badge" alt="Stars"></a>
  </p>

  <h3>简体中文 | <a href="README-en.md">English</a></h3>

  <p>
    一个面向 Windows 的本地剪贴板文本管理工具，支持同步剪切板内容、单手快捷操作和自定义分组。
  </p>
</div>

## 核心能力

✅自动同步当前剪切板内容到内置历史分组

✅通过单手键盘即可切换分组、选中文本并完成粘贴

✅支持自定义全局快捷键和面板内导航快捷键

✅支持自定义分组和文本内容

## 界面预览

### 主面板

![主面板](assets/main-panel.png)

### 同步剪切板

![同步剪切板](assets/clipboard-sync.gif)

### 单手快捷操作

![快捷键](assets/shortcuts.png)

### 分组管理

![分组管理](assets/groups.png)

### 系统设置

![系统设置](assets/settings.png)

## 功能说明

- 同步剪贴板内容到内置“剪贴板”分组。
- 单手即可完成分组切换、文本选择和粘贴。
- 支持自定义分组和文本内容。
- 管理页顶部包含系统、快捷键、分组三个栏目，可通过已绑定的左右切换键横向切换。
- 系统设置页也支持快捷键操作，可通过已绑定的上下选择键在设置项间切换，通过确认键操作开关或清空动作。
- 可在系统设置中清空剪贴板历史。
- 同一段剪贴板内容只保留一条。
- 已经保存过但后来被清空的内容，再次复制时不会重复插入多条。
- 自动粘贴开启时，会在切回目标窗口后发送 `Ctrl+V`。
- 分发包采用单 exe 形式，用户下载后即可直接使用。

## 交互细节

- 主面板顶部使用分组标签栏，支持鼠标点击，也支持快捷键设置中绑定的左右切换键切换分组。
- 主面板文本列表支持已绑定的上下选择键移动选中项，按确认键后复制或自动粘贴当前文本。
- 管理页使用图标按钮承载高频操作，包括返回、新增分组、新增条目、从剪贴板添加、编辑、删除和恢复默认快捷键。
- 分组管理列表支持拖拽排序；拖动分组行左侧把手即可调整显示顺序。
- 分组文本管理页支持双击标题重命名分组，回车确认，失焦自动保存。
- 分组文本管理页的文本条目支持上下拖拽交换排序，也支持直接编辑或删除单条文本。
- 快捷键设置独立成页，可录制全局唤出快捷键和面板内导航键，并可一键恢复默认。
- 默认面板导航键为 `W` / `S` / `A` / `D` / `F`，用户修改后以快捷键页当前绑定为准。
- 删除和清空类操作会使用确认状态或危险色 hover，减少误触。

## 适用场景

- 日常复制粘贴
- 多分组文本管理
- 单手切换分组和粘贴
- vibe coding 时反复粘贴相同提示词、代码片段和说明文本

## 快速开始

前往 [Releases](https://github.com/Yskysoar/TorCV/releases) 下载发布版 exe，双击即可运行，无需安装、无需额外配置。

## 常见问题

### Windows 提示未知发布者怎么办？

当前版本未做代码签名，Windows 可能会显示安全提示。确认下载来源为本项目 Releases 后，可以选择继续运行。

### 数据会上传到服务器吗？

不会。TorCV 是本地剪贴板文本管理工具，数据保存在本机。

打包版默认数据文件路径：

```text
%APPDATA%\TorCV\torcv.json
```

本地开发运行时默认数据文件路径：

```text
data\torcv.json
```

### 首次打开为什么比较慢？

发布版是单 exe 便携包，首次启动时需要完成 Electron 运行时初始化和应用资源准备，响应可能比后续打开慢一些。

### 自动粘贴为什么有一点延迟？

自动粘贴会先把文本写入系统剪贴板，再切回目标窗口并发送 `Ctrl+V`。这个过程依赖 Windows 前台窗口切换和应用焦点响应，因此可能存在短暂延迟。

### 遇到问题或有功能建议怎么办？

可以前往 [Issues](https://github.com/Yskysoar/TorCV/issues) 提交问题、反馈或功能建议。

## 许可证

详见 [LICENSE](LICENSE)。

## Star History

<p align="center">
  <a href="https://star-history.com/#Yskysoar/TorCV&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Yskysoar/TorCV&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Yskysoar/TorCV&type=Date" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Yskysoar/TorCV&type=Date" />
    </picture>
  </a>
</p>
