# TorCV

TorCV is a Windows clipboard text manager built with Electron. It provides local text groups, a compact clipboard-style panel, keyboard navigation, global shortcut launch, tray access, clipboard monitoring, and optional auto-paste.

## Features

- Local text groups and item management.
- Windows clipboard-style floating panel.
- Global shortcut and tray menu.
- Keyboard navigation with configurable key bindings.
- Clipboard monitoring with a built-in clipboard history group.
- Optional auto-paste to the previously active window.
- Portable single-exe build target.

## Requirements

- Windows
- Node.js 20 or newer
- npm

## Development

```powershell
npm install
npm run lint
npm run typecheck
npm test
npm start
```

## Build

```powershell
npm run dist
```

The portable executable is written to:

```text
dist/TorCV-1.0.0.exe
```

## Data Storage

Development data is stored under:

```text
data/torcv.json
```

Packaged builds store user data under:

```text
%APPDATA%\TorCV\torcv.json
```

This keeps the distributed build as a single executable while storing user data in the Windows user profile.

## License

MIT
