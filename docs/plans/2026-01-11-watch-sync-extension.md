# Watch Sync Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a VSCode extension that synchronizes a local directory to a remote machine via SSH/rsync using inotifywait for real-time monitoring on Linux.

**Architecture:**
- **Frontend:** VSCode Extension API for settings, commands, and status bar.
- **Watcher Service:** Spawns `inotifywait` process to listen for filesystem events (create, delete, modify, move).
- **Sync Service:** Executes `rsync` via `child_process` based on events.
- **Configuration:** `settings.json` driven.
- **Platform:** Linux only (initial release).

**Tech Stack:** TypeScript, VSCode Extension API, rsync, inotify-tools (Linux).

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.vscode/launch.json`
- Create: `src/extension.ts`
- Create: `.gitignore`

**Step 1: Initialize Extension Structure**
- Create standard VSCode extension directory structure.
- Configure `package.json` with minimal metadata.
- Configure `tsconfig.json` for VSCode extension development.

**Step 2: Install Dependencies**
- `npm install -D @types/vscode @types/node typescript ts-loader webpack webpack-cli`
- `npm install -D @vscode/test-electron` (if testing needed later)

**Step 3: Create Entry Point**
- Create basic `src/extension.ts` that activates and logs "Watch Sync Active".

**Step 4: Verify Build**
- Run `npm run compile` to ensure scaffolding is correct.

---

### Task 2: Configuration Schema (`settings.json`)

**Files:**
- Modify: `package.json`
- Create: `src/configuration.ts`

**Step 1: Define `contributes.configuration`**
- Add schema for:
    - `watchSync.remoteUser` (string)
    - `watchSync.remoteHost` (string)
    - `watchSync.remoteDir` (string)
    - `watchSync.localDir` (string, default: workspaceRoot)
    - `watchSync.sshPort` (number, default: 22)
    - `watchSync.autoStart` (boolean, default: false)
    - `watchSync.direction` (enum: localToRemote, remoteToLocal, bidirectional)
    - `watchSync.conflictPolicy` (enum: localWins)

**Step 2: Implement Configuration Manager**
- Create `src/configuration.ts` to strictly type and read these settings.
- Implement validation logic (e.g., ensure `localDir` exists).

---

### Task 3: Watcher Implementation (`inotifywait`)

**Files:**
- Create: `src/watcher.ts`
- Test: `src/test/suite/watcher.test.ts`

**Step 1: Define Watcher Interface**
- `start(path: string): void`
- `stop(): void`
- `onDidModify(callback)`

**Step 2: Implement InotifyWrapper**
- Spawn `inotifywait -m -r -e close_write,create,delete,move <path>`.
- Parse stdout line-by-line.
- Debounce events (collect events for 200ms then emit).

**Step 3: Handle Process Lifecycle**
- Ensure child process is killed when extension deactivates.

---

### Task 4: Sync Implementation (`rsync`)

**Files:**
- Create: `src/syncer.ts`
- Test: `src/test/suite/syncer.test.ts`

**Step 1: Define Rsync Builder**
- Helper to construct `rsync` command strings based on config (SSH port, excludes).

**Step 2: Implement Sync Function**
- `syncPath(relativePath: string, direction: Direction): Promise<void>`
- For "Local Wins" (Project Default):
    - `rsync -az --delete <local> <remote>`
- Handle errors and capture stderr.

---

### Task 5: Extension Logic & Validation

**Files:**
- Modify: `src/extension.ts`
- Create: `src/validator.ts`

**Step 1: Implement Prerequisites Check**
- Check if `rsync` and `inotifywait` exist in `$PATH`.
- Show error message if missing.

**Step 2: Implement Directory Limit**
- Check if `localDir` count > 1 (Project constraint: only 1 dir allowed).
- Log error and exit if > 1.

**Step 3: Wire Events**
- On `watcher.onDidModify` -> call `syncer.syncPath`.

**Step 4: Commands**
- Register `watchSync.start` and `watchSync.stop`.

---

### Task 6: Logging & UX

**Files:**
- Create: `src/logger.ts`
- Modify: `src/extension.ts`

**Step 1: Output Channel**
- Create "Watch Sync" output channel.
- Log all rsync operations and watcher events there.

**Step 2: Status Bar Item**
- Add status bar item showing "Sync: ON" / "Sync: OFF".
- Spinner icon while syncing.

