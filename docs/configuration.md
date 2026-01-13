# Configuration Guide

This extension uses VSCode's standard `settings.json` for configuration. Profiles can be managed either by editing `settings.json` directly or by using the interactive wizard (`Watch Sync: Start` command).

## Schema (`settings.json`)

### `watchSync.profiles`
An array of sync profiles. Each profile is an object with the following properties:

| Property | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `alias` | string | Yes | A unique name for this profile (e.g., "dev-server"). |
| `remoteUser` | string | Yes | SSH Username for the remote machine. |
| `remoteHost` | string | Yes | IP address or hostname of the remote machine. |
| `remoteDir` | string | Yes | Absolute path on the remote machine to sync to. |
| `localDir` | string | Yes | Absolute path on the local machine. Supports `${workspaceFolder}`. |
| `sshPort` | number | No (22) | SSH port of the remote machine. |
| `direction` | enum | No | `localToRemote` (default), `remoteToLocal`, `bidirectional`. |
| `exclude` | array | No | List of patterns to exclude (e.g., `[".git", "node_modules"]`). |

### `watchSync.autoStartProfile`
- **Type**: `string`
- **Description**: Optional. The `alias` of a profile to automatically start when VSCode launches.

## Example `settings.json`

```json
{
    "watchSync.profiles": [
        {
            "alias": "dev-server",
            "remoteUser": "developer",
            "remoteHost": "192.168.1.50",
            "sshPort": 2222,
            "localDir": "${workspaceFolder}/src",
            "remoteDir": "/var/www/my-app/src",
            "direction": "localToRemote",
            "exclude": [
                ".git",
                "node_modules"
            ]
        },
        {
            "alias": "staging-server",
            "remoteUser": "deploy",
            "remoteHost": "staging.example.com",
            "sshPort": 22,
            "localDir": "${workspaceFolder}",
            "remoteDir": "/var/www/staging"
        }
    ],
    "watchSync.autoStartProfile": "dev-server"
}
```
