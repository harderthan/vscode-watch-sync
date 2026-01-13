# Prerequisites & System Requirements

This extension relies on system-level tools to function. It does not bundle these binaries.

## 1. Operating System
- **Local Machine:** Linux (Ubuntu, Debian, Fedora, Arch, etc.)
    - *Why?* The watcher uses `inotifywait` which is a Linux kernel feature interface.
- **Remote Machine:** Any POSIX-compliant system with SSH and rsync (Linux, macOS, BSD).

## 2. Dependencies
You must install the following tools on your **Local Machine**:

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install rsync inotify-tools openssh-client
```

### Fedora/RHEL
```bash
sudo dnf install rsync inotify-tools openssh-clients
```

### Arch Linux
```bash
sudo pacman -S rsync inotify-tools openssh
```

## 3. SSH Configuration
The extension connects via non-interactive SSH.
- **Passwordless Auth is Required:** You must set up SSH Public Key authentication.
- **Test:** Run this in your terminal. If it asks for a password, the extension **will fail**.
    ```bash
    ssh -p <PORT> <USER>@<HOST> echo "ok"
    ```

## 4. VSCode
- Version 1.70.0 or higher.
