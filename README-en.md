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

  <h3><a href="README.md">简体中文</a> | English</h3>

  <p>
    A local Windows clipboard text manager for sync, quick switching, and custom groups.
  </p>
</div>

## Highlights

✅Sync clipboard content into built-in history

✅One-hand keyboard flow for group switching, item selection, and paste

✅Custom global shortcut and panel navigation keys

✅Custom text groups and item content

## Preview

### Main Panel

![Main Panel](assets/main-panel.png)

### Clipboard Sync

![Clipboard Sync](assets/clipboard-sync.gif)

### Shortcuts

![Shortcuts](assets/shortcuts.png)

### Group Management

![Group Management](assets/groups.png)

### Settings

![Settings](assets/settings.png)

## What it does

- Sync clipboard content into the built-in clipboard group.
- Switch groups, select text, and paste with one hand.
- Create custom groups and edit custom text items.
- The management view has System, Shortcuts, and Groups tabs, and the bound left/right navigation keys can switch between them.
- The system settings page is keyboard-friendly too: use the bound up/down selection keys to move between settings and the confirm key to toggle or clear.
- Clipboard history can be cleared from settings.
- Duplicate clipboard text is kept as a single entry.
- Previously saved and later cleared text will not be duplicated when copied again.
- Optional auto-paste sends `Ctrl+V` to the previous active window.
- The distributed build is a single exe and works out of the box.

## Interaction Details

- The main panel uses a group tab strip that supports both mouse clicks and the left/right navigation keys configured in shortcut settings.
- The main text list supports the bound up/down selection keys, then the confirm key to copy or auto-paste the selected text.
- The management view uses icon buttons for common actions, including back, add group, add item, add from clipboard, edit, delete, and reset shortcuts.
- The group list supports drag sorting; drag the handle on the left side of a group row to reorder groups.
- In a group's text management page, double-click the title to rename the group, press Enter to confirm, or blur the input to save.
- Text items in a group can be dragged up and down to reorder them, and each item can be edited or deleted directly.
- Shortcut settings live on their own page, with recording for the global launch shortcut and panel navigation keys, plus a one-click reset.
- The default panel navigation keys are `W` / `S` / `A` / `D` / `F`, but the current bindings in the shortcut page always take precedence.
- Delete and clear actions use confirmation states or danger hover styles to reduce accidental operations.

## Use Cases

- Daily copy/paste work
- Multi-group text management
- One-hand group switching and pasting
- Vibe coding, where the same prompts, code snippets, and notes are pasted repeatedly

## Quick Start

Go to [Releases](https://github.com/Yskysoar/TorCV/releases), download the release exe, and run it directly. No installation or extra configuration is required.

## FAQ

### Why does Windows show an unknown publisher warning?

The current build is not code-signed, so Windows may show a security warning. If the exe was downloaded from this project's Releases page, you can choose to continue.

### Does TorCV upload my data to a server?

No. TorCV is a local clipboard text manager, and its data stays on your machine.

Packaged builds store data at:

```text
%APPDATA%\TorCV\torcv.json
```

Local development runs store data at:

```text
data\torcv.json
```

### Why can the first launch feel slow?

The release build is a portable single exe. On first launch, it needs to initialize the Electron runtime and prepare app resources, so it may feel slower than later opens.

### Why does auto-paste have a small delay?

Auto-paste writes text to the system clipboard, switches back to the target window, and sends `Ctrl+V`. This depends on Windows foreground-window switching and the target app's focus response, so a short delay can happen.

### How do I report bugs or request features?

Open an [Issue](https://github.com/Yskysoar/TorCV/issues) for bug reports, feedback, or feature requests.

## License

See [LICENSE](LICENSE).

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
