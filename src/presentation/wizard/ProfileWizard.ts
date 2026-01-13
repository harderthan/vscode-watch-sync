import * as vscode from 'vscode';
import { IConfigurationProvider, ProfileConfig } from '../../infrastructure/config/IConfigurationProvider';
import { ILogger } from '../../core/logger/ILogger';

const DEFAULT_EXCLUDES = ['.git', 'node_modules', '.DS_Store', '__pycache__', '*.pyc', '.venv'];

/**
 * Profile wizard for creating and selecting profiles
 */
export class ProfileWizard {
  constructor(
    private readonly configProvider: IConfigurationProvider,
    private readonly logger: ILogger
  ) {}

  /**
   * Show profile selection or create new
   */
  async selectOrCreateProfile(): Promise<ProfileConfig | undefined> {
    const profiles = this.configProvider.getProfiles();

    const items: vscode.QuickPickItem[] = [
      {
        label: '$(add) Create New Profile...',
        description: 'Create a new sync profile',
        alwaysShow: true
      },
      ...profiles.map(p => ({
        label: p.alias,
        description: `${p.remoteUser}@${p.remoteHost}:${p.remoteDir}`,
        detail: `Local: ${p.localDir}`
      }))
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a profile or create a new one',
      title: 'Watch Sync Profile'
    });

    if (!selected) {
      return undefined;
    }

    if (selected.label.includes('Create New Profile')) {
      return this.createProfile();
    }

    return this.configProvider.getProfile(selected.label);
  }

  /**
   * Create a new profile through wizard steps
   */
  async createProfile(): Promise<ProfileConfig | undefined> {
    // Step 1: Alias
    const alias = await vscode.window.showInputBox({
      prompt: 'Enter profile alias (unique name)',
      placeHolder: 'e.g., my-server',
      validateInput: (value) => {
        if (!value.trim()) {
          return 'Alias is required';
        }
        if (this.configProvider.getProfile(value)) {
          return 'Profile with this alias already exists';
        }
        return undefined;
      }
    });

    if (!alias) return undefined;

    // Step 2: Remote Host
    const remoteHost = await vscode.window.showInputBox({
      prompt: 'Enter remote host (IP or hostname)',
      placeHolder: 'e.g., 192.168.1.100 or server.example.com'
    });

    if (!remoteHost) return undefined;

    // Step 3: Remote User
    const remoteUser = await vscode.window.showInputBox({
      prompt: 'Enter remote username',
      placeHolder: 'e.g., ubuntu'
    });

    if (!remoteUser) return undefined;

    // Step 4: Remote Directory
    const remoteDir = await vscode.window.showInputBox({
      prompt: 'Enter remote directory (absolute path)',
      placeHolder: 'e.g., /home/ubuntu/project'
    });

    if (!remoteDir) return undefined;

    // Step 5: Local Directory
    const localDir = await vscode.window.showInputBox({
      prompt: 'Enter local directory',
      value: '${workspaceFolder}',
      placeHolder: 'e.g., ${workspaceFolder} or /path/to/local'
    });

    if (!localDir) return undefined;

    // Step 6: SSH Port
    const sshPortStr = await vscode.window.showInputBox({
      prompt: 'Enter SSH port',
      value: '22',
      validateInput: (value) => {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Enter a valid port number (1-65535)';
        }
        return undefined;
      }
    });

    if (!sshPortStr) return undefined;

    const sshPort = parseInt(sshPortStr, 10);

    // Step 7: Exclude patterns (optional)
    const excludeStr = await vscode.window.showInputBox({
      prompt: 'Enter exclude patterns (comma-separated)',
      value: DEFAULT_EXCLUDES.join(', '),
      placeHolder: 'e.g., .git, node_modules, *.log'
    });

    const exclude = excludeStr
      ? excludeStr.split(',').map(s => s.trim()).filter(s => s)
      : DEFAULT_EXCLUDES;

    // Create profile config
    const profile: ProfileConfig = {
      alias: alias.trim(),
      remoteHost: remoteHost.trim(),
      remoteUser: remoteUser.trim(),
      remoteDir: remoteDir.trim(),
      localDir: localDir.trim(),
      sshPort,
      direction: 'localToRemote',
      conflictPolicy: 'localWins',
      exclude
    };

    // Validate
    const validation = await this.configProvider.validate(profile);
    if (!validation.valid) {
      const proceed = await vscode.window.showWarningMessage(
        `Validation warnings: ${validation.errors.join(', ')}`,
        'Save Anyway',
        'Cancel'
      );

      if (proceed !== 'Save Anyway') {
        return undefined;
      }
    }

    // Save profile
    await this.configProvider.addProfile(profile);
    this.logger.info('Wizard', `Created profile: ${alias}`);

    vscode.window.showInformationMessage(`Profile "${alias}" created successfully`);

    return profile;
  }
}
