import * as vscode from 'vscode';
import { SyncOrchestrator } from '../../application/SyncOrchestrator';
import { Profile } from '../../domain/entities/Profile';
import { IConfigurationProvider, ProfileConfig } from '../../infrastructure/config/IConfigurationProvider';
import { ILogger } from '../../core/logger/ILogger';
import { ICredentialManager } from '../../infrastructure/credentials/ICredentialManager';
import { ProfileWizard } from '../wizard/ProfileWizard';

/**
 * Callback to set password on SSH/rsync clients
 */
export type SetPasswordCallback = (password: string | null) => void;

/**
 * Command to start watching and syncing
 */
export class StartWatchCommand {
  constructor(
    private readonly orchestrator: SyncOrchestrator,
    private readonly configProvider: IConfigurationProvider,
    private readonly wizard: ProfileWizard,
    private readonly logger: ILogger,
    private readonly credentialManager?: ICredentialManager,
    private readonly setPasswordCallback?: SetPasswordCallback
  ) {}

  /**
   * Execute the start command
   */
  async execute(): Promise<void> {
    try {
      // Select or create profile
      const profileConfig = await this.wizard.selectOrCreateProfile();

      if (!profileConfig) {
        return; // User cancelled
      }

      await this.startWithConfig(profileConfig);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('StartCommand', message);
      vscode.window.showErrorMessage(`Failed to start Watch Sync: ${message}`);
    }
  }

  /**
   * Execute with a specific profile alias
   */
  async executeWithProfile(alias: string): Promise<void> {
    try {
      const profileConfig = this.configProvider.getProfile(alias);

      if (!profileConfig) {
        vscode.window.showErrorMessage(`Profile not found: ${alias}`);
        return;
      }

      await this.startWithConfig(profileConfig);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('StartCommand', message);
      vscode.window.showErrorMessage(`Failed to start Watch Sync: ${message}`);
    }
  }

  /**
   * Start with a profile config, handling password authentication
   */
  private async startWithConfig(profileConfig: ProfileConfig): Promise<void> {
    // Validate
    const validation = await this.configProvider.validate(profileConfig);
    if (!validation.valid) {
      vscode.window.showErrorMessage(
        `Profile validation failed: ${validation.errors.join(', ')}`
      );
      return;
    }

    // Resolve variables
    const resolvedConfig = this.configProvider.resolveVariables(profileConfig);

    // Convert to Profile entity
    const profile = this.configToProfile(resolvedConfig);

    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Try to get stored password if credential manager is available
    if (this.credentialManager && this.setPasswordCallback) {
      const storedPassword = await this.credentialManager.getPassword(
        profile.remoteHost,
        profile.remoteUser
      );

      if (storedPassword) {
        this.setPasswordCallback(storedPassword);
        this.logger.info('StartCommand', `Using stored credentials for ${profile.remoteUser}@${profile.remoteHost}`);
      }
    }

    try {
      // Try to start orchestrator
      await this.orchestrator.start(profile, workspaceFolder);

      vscode.window.showInformationMessage(
        `Watch Sync started: ${profile.alias}`
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Check if error is related to SSH authentication
      if (this.isAuthError(message) && this.credentialManager && this.setPasswordCallback) {
        this.logger.info('StartCommand', 'SSH authentication failed, prompting for password');

        const password = await this.credentialManager.promptForPassword(
          profile.remoteHost,
          profile.remoteUser
        );

        if (password) {
          this.setPasswordCallback(password);

          // Retry with password
          await this.orchestrator.start(profile, workspaceFolder);

          vscode.window.showInformationMessage(
            `Watch Sync started: ${profile.alias}`
          );
          return;
        } else {
          throw new Error('Authentication cancelled by user');
        }
      }

      throw error;
    }
  }

  /**
   * Check if error is related to SSH authentication
   */
  private isAuthError(message: string): boolean {
    const authErrorPatterns = [
      'permission denied',
      'authentication failed',
      'all configured authentication methods failed',
      'host key verification failed',
      'no matching host key',
      'connection refused',
      'publickey',
      'keyboard-interactive'
    ];

    const lowerMessage = message.toLowerCase();
    return authErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  }

  private configToProfile(config: ProfileConfig): Profile {
    return new Profile({
      alias: config.alias,
      remoteUser: config.remoteUser,
      remoteHost: config.remoteHost,
      remoteDir: config.remoteDir,
      localDir: config.localDir,
      sshPort: config.sshPort,
      direction: config.direction,
      conflictPolicy: config.conflictPolicy,
      exclude: config.exclude
    });
  }
}
