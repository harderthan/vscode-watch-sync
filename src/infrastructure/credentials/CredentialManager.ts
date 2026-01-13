import * as vscode from 'vscode';
import { ICredentialManager } from './ICredentialManager';
import { ILogger } from '../../core/logger/ILogger';

const SECRET_KEY_PREFIX = 'watchSync.password';

/**
 * Credential manager using VSCode SecretStorage API
 * Passwords are stored securely in the OS keychain
 */
export class CredentialManager implements ICredentialManager {
  constructor(
    private readonly secretStorage: vscode.SecretStorage,
    private readonly logger: ILogger
  ) {}

  private getSecretKey(host: string, user: string): string {
    return `${SECRET_KEY_PREFIX}.${user}@${host}`;
  }

  async getPassword(host: string, user: string): Promise<string | null> {
    const key = this.getSecretKey(host, user);
    const password = await this.secretStorage.get(key);

    if (password) {
      this.logger.debug('Credentials', `Retrieved stored password for ${user}@${host}`);
    }

    return password ?? null;
  }

  async setPassword(host: string, user: string, password: string): Promise<void> {
    const key = this.getSecretKey(host, user);
    await this.secretStorage.store(key, password);
    this.logger.info('Credentials', `Stored password for ${user}@${host}`);
  }

  async deletePassword(host: string, user: string): Promise<void> {
    const key = this.getSecretKey(host, user);
    await this.secretStorage.delete(key);
    this.logger.info('Credentials', `Deleted password for ${user}@${host}`);
  }

  async hasPassword(host: string, user: string): Promise<boolean> {
    const password = await this.getPassword(host, user);
    return password !== null;
  }

  async promptForPassword(host: string, user: string): Promise<string | null> {
    const password = await vscode.window.showInputBox({
      prompt: `Enter SSH password for ${user}@${host}`,
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'SSH password'
    });

    if (password === undefined) {
      this.logger.info('Credentials', 'Password prompt cancelled by user');
      return null;
    }

    if (password) {
      // Ask if user wants to save the password
      const save = await vscode.window.showQuickPick(
        ['Yes, save password', 'No, use only this time'],
        {
          placeHolder: 'Save password for future sessions?',
          ignoreFocusOut: true
        }
      );

      if (save === 'Yes, save password') {
        await this.setPassword(host, user, password);
      }
    }

    return password;
  }

  /**
   * Get password, prompting if not stored
   */
  async getOrPromptPassword(host: string, user: string): Promise<string | null> {
    // First try to get stored password
    const stored = await this.getPassword(host, user);
    if (stored) {
      return stored;
    }

    // Prompt for password
    return this.promptForPassword(host, user);
  }
}
