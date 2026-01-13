# Troubleshooting

## View Logs
All operations are logged to the VSCode Output Channel.
1. Press `Ctrl+Shift+U` (or `Cmd+Shift+U`).
2. Select **"Watch Sync"** from the dropdown menu.

## Common Errors

### "inotifywait not found"
- **Cause:** The `inotify-tools` package is not installed.
- **Fix:** Install it via your package manager (see `prerequisites.md`).

### "Host key verification failed"
- **Cause:** The remote host is not in your `~/.ssh/known_hosts` or the key has changed.
- **Fix:** Connect manually once via terminal (`ssh user@host`) and accept the fingerprint.

### "Permission denied (publickey)"
- **Cause:** SSH key authentication failed.
- **Fix:** Ensure you have copied your public key to the remote: `ssh-copy-id -p <PORT> user@host`.

### "Watches limit reached"
- **Cause:** Linux has a limit on how many files can be watched (`fs.inotify.max_user_watches`).
- **Fix:** Increase the limit.
    ```bash
    # Check current limit
    cat /proc/sys/fs/inotify/max_user_watches
    
    # Increase temporarily
    sudo sysctl fs.inotify.max_user_watches=524288
    
    # Make permanent (add to /etc/sysctl.conf)
    echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

## Resetting
If the sync gets stuck:
1. Open Command Palette (`Ctrl+Shift+P`).
2. Run `Watch Sync: Stop`.
3. Run `Watch Sync: Start`.
