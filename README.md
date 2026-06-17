<div align="center">
  <h1>
    TorCV
  </h1>

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

- [x] 自动同步当前剪切板内容到内置历史分组
- [x] 通过单手键盘即可切换分组、选中文本并完成粘贴
- [x] 支持自定义全局快捷键和面板内导航快捷键
- [x] 支持自定义分组和文本内容

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
- 系统设置页也支持快捷键操作。
- 可在系统设置中清空剪贴板历史。
- 同一段剪贴板内容只保留一条。
- 已经保存过但后来被清空的内容，再次复制时不会重复插入多条。
- 自动粘贴开启时，会在切回目标窗口后发送 `Ctrl+V`。
- 分发包采用单 exe 形式，用户下载后即可直接使用。

## 适用场景

- 日常复制粘贴
- 多分组文本管理
- 单手切换分组和粘贴
- vibe coding 时反复粘贴相同提示词、代码片段和说明文本

## 快速开始

前往 [Releases](https://github.com/Yskysoar/TorCV/releases) 下载发布版 exe，双击即可运行，无需安装、无需额外配置。

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
