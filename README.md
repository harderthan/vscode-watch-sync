# Watch Sync

A Visual Studio Code extension that monitors local directory changes and automatically syncs them to a remote server via SSH/rsync.

## Features

- **Real-time file monitoring** using `inotifywait` for instant change detection
- **Efficient sync** via `rsync` - only transfers changed files
- **Multiple profiles** - configure different sync targets for different projects
- **Auto-start** - automatically start syncing when VS Code opens
- **Status bar integration** - view current sync status at a glance
- **Secure authentication** - supports SSH key and password authentication
- **Credential storage** - passwords stored securely in OS keychain via VS Code SecretStorage

## Requirements

This extension requires a Linux environment with the following packages installed:

- `rsync` - for file synchronization
- `inotify-tools` - for file system monitoring

### Installation

**Ubuntu/Debian:**
```bash
sudo apt install rsync inotify-tools
```

**Fedora/RHEL:**
```bash
sudo dnf install rsync inotify-tools
```

**Arch Linux:**
```bash
sudo pacman -S rsync inotify-tools
```

## Installation

### From VSIX

1. Build the extension:
   ```bash
   npm install
   npm run vsix
   ```

2. Install in VS Code:
   ```bash
   code --install-extension watch-sync-0.0.1.vsix
   ```

### From Source

```bash
git clone <repository-url>
cd watch-sync
npm install
npm run package
```

Then press `F5` in VS Code to launch the extension in debug mode.

## Configuration

Add sync profiles to your VS Code settings (`settings.json`):

```json
{
  "watchSync.profiles": [
    {
      "alias": "my-server",
      "remoteUser": "username",
      "remoteHost": "192.168.1.100",
      "remoteDir": "/home/username/project",
      "localDir": "${workspaceFolder}",
      "sshPort": 22,
      "exclude": [".git", "node_modules", "dist"]
    }
  ],
  "watchSync.autoStartProfile": "my-server"
}
```

### Profile Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `alias` | string | Yes | - | Unique name for this profile |
| `remoteUser` | string | Yes | - | SSH username |
| `remoteHost` | string | Yes | - | Remote server hostname or IP |
| `remoteDir` | string | Yes | - | Remote directory path |
| `localDir` | string | No | `${workspaceFolder}` | Local directory to sync |
| `sshPort` | number | No | `22` | SSH port |
| `exclude` | string[] | No | `[".git", "node_modules"]` | Patterns to exclude from sync |
| `direction` | string | No | `localToRemote` | Sync direction (currently only `localToRemote`) |
| `conflictPolicy` | string | No | `localWins` | Conflict resolution policy (currently only `localWins`) |

### Variables

- `${workspaceFolder}` - Current workspace folder path

## Usage

### Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

| Command | Description |
|---------|-------------|
| `Watch Sync: Start` | Start file watching and syncing |
| `Watch Sync: Stop` | Stop file watching |

### Status Bar

The status bar shows the current sync status:

- **Idle** - Not syncing
- **Watching** - Monitoring for file changes
- **Syncing** - Transferring files
- **Error** - Sync error occurred

Click the status bar item to start/stop syncing.

### SSH Authentication

The extension supports two authentication methods:

1. **SSH Key** (recommended) - Uses keys from `~/.ssh/` (id_rsa, id_ed25519, id_ecdsa)
2. **Password** - Enter when prompted, optionally save to OS keychain

## Extension Settings

This extension contributes the following settings:

| Setting | Description |
|---------|-------------|
| `watchSync.profiles` | Array of sync profile configurations |
| `watchSync.autoStartProfile` | Profile alias to auto-start on VS Code launch |

## Known Issues

- Only supports Linux environments (requires `inotifywait`)
- Sync direction is currently limited to local-to-remote only

## Development

```bash
# Install dependencies
npm install

# Watch mode (development)
npm run watch

# Lint
npm run lint

# Run tests
npm run test

# Production build
npm run package

# Create VSIX package
npm run vsix
```

## Architecture

The extension follows clean architecture principles:

```
src/
├── core/           # Shared types, utilities, logger
├── domain/         # Business logic (entities, services)
├── infrastructure/ # External integrations (SSH, rsync, file watcher)
├── application/    # Orchestration and state management
└── presentation/   # UI (commands, status bar, wizard)
```

## License

MIT
