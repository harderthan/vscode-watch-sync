# Synchronization Logic

## Architecture
The synchronization is event-driven for local changes and behaves according to the configured direction.

### 1. Watcher (Local)
- **Tool:** `inotifywait` (Linux)
- **Events:** 
    - `MOVED_TO`, `MOVED_FROM` (Renames)
    - `CLOSE_WRITE` (File modifications)
    - `CREATE` (New files/dirs)
    - `DELETE` (Deletions)
- **Debounce:** Events are grouped within a 200ms window to prevent spamming `rsync` processes.

### 2. Direction Modes

#### A. Local To Remote (Default)
- **Trigger:** Local file change detected by `inotifywait`.
- **Action:** `rsync` pushes the specific changed file/folder to the remote.
- **Safety:** Uses `--delete` to ensure the remote mirrors the local state (e.g., if you delete a file locally, it is deleted remotely).

#### B. Remote To Local
- **Trigger:** (Not implemented in v1.0 real-time). currently requires manual trigger or poll. 
- *Note: True real-time remote-to-local requires a watcher agent on the remote machine, which is out of scope for the SSH-only agentless design.*

#### C. Bidirectional
- **Trigger:** Local changes push. 
- **Conflict:** If `localWins` is set, local changes always overwrite remote changes.

### 3. Conflict Policy: `localWins`
This is the default and currently recommended policy.
- **Rule:** The Local machine is the "Source of Truth".
- **Scenario:** If a file changes on the remote, it will be overwritten the next time the local file changes.
- **Rationale:** Prevents complex merge conflicts without requiring a git-like history engine.

### 4. Sync Command
The underlying command constructed is:
```bash
rsync -az --delete -e "ssh -p <PORT>" <SOURCE> <DEST>
```
