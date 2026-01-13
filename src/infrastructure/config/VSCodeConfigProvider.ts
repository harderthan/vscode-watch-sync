import * as vscode from 'vscode';
import { IConfigurationProvider, ProfileConfig } from './IConfigurationProvider';
import { ValidationResult } from '../../core/types';
import { PathUtils } from '../../core/utils/PathUtils';
import { ILogger } from '../../core/logger/ILogger';

/**
 * VSCode settings-based configuration provider
 */
export class VSCodeConfigProvider implements IConfigurationProvider {
  private readonly configSection = 'watchSync';

  constructor(private readonly logger: ILogger) {}

  getProfiles(): ProfileConfig[] {
    const config = vscode.workspace.getConfiguration(this.configSection);
    const profiles = config.get<ProfileConfig[]>('profiles') || [];
    return profiles;
  }

  getProfile(alias: string): ProfileConfig | undefined {
    const profiles = this.getProfiles();
    return profiles.find(p => p.alias === alias);
  }

  async addProfile(profile: ProfileConfig): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    const profiles = this.getProfiles();

    const existingIndex = profiles.findIndex(p => p.alias === profile.alias);

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
      this.logger.info('Config', `Updated profile: ${profile.alias}`);
    } else {
      profiles.push(profile);
      this.logger.info('Config', `Added new profile: ${profile.alias}`);
    }

    await config.update('profiles', profiles, vscode.ConfigurationTarget.Global);
  }

  async deleteProfile(alias: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    const profiles = this.getProfiles();

    const index = profiles.findIndex(p => p.alias === alias);
    if (index < 0) {
      return false;
    }

    profiles.splice(index, 1);
    await config.update('profiles', profiles, vscode.ConfigurationTarget.Global);
    this.logger.info('Config', `Deleted profile: ${alias}`);
    return true;
  }

  getAutoStartProfile(): string | undefined {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<string>('autoStartProfile');
  }

  async setAutoStartProfile(alias: string | undefined): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update('autoStartProfile', alias, vscode.ConfigurationTarget.Global);
    this.logger.info('Config', `Set auto-start profile: ${alias || 'none'}`);
  }

  async validate(profile: ProfileConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Required fields check
    if (!profile.alias?.trim()) {
      errors.push('Profile alias is required');
    }
    if (!profile.remoteUser?.trim()) {
      errors.push('Remote user is required');
    }
    if (!profile.remoteHost?.trim()) {
      errors.push('Remote host is required');
    }
    if (!profile.remoteDir?.trim()) {
      errors.push('Remote directory is required');
    }
    if (!profile.localDir?.trim()) {
      errors.push('Local directory is required');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Resolve variables for validation
    const resolved = this.resolveVariables(profile);

    // Local directory validation
    const exists = await PathUtils.exists(resolved.localDir);
    if (!exists) {
      errors.push(`Local directory does not exist: ${resolved.localDir}`);
    } else {
      const isDir = await PathUtils.isDirectory(resolved.localDir);
      if (!isDir) {
        errors.push(`Local path is not a directory: ${resolved.localDir}`);
      } else {
        const isReadable = await PathUtils.isReadable(resolved.localDir);
        if (!isReadable) {
          errors.push(`Local directory is not readable: ${resolved.localDir}`);
        }
      }
    }

    // SSH port validation
    if (profile.sshPort !== undefined) {
      if (!Number.isInteger(profile.sshPort) || profile.sshPort < 1 || profile.sshPort > 65535) {
        errors.push('SSH port must be a valid port number (1-65535)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  resolveVariables(profile: ProfileConfig): ProfileConfig {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
      return profile;
    }

    return {
      ...profile,
      localDir: PathUtils.resolveWorkspaceFolder(profile.localDir, workspaceFolder),
      remoteDir: PathUtils.resolveWorkspaceFolder(profile.remoteDir, workspaceFolder)
    };
  }
}
