import { ValidationResult } from '../../core/types';
import { PathUtils } from '../../core/utils/PathUtils';
import { Profile } from '../entities/Profile';
import { ConfigurationError } from '../errors';

/**
 * Profile validation rules
 */
export interface ProfileValidationOptions {
  checkLocalDirectory?: boolean;
  checkRemoteDirectory?: boolean;
  workspaceFolder?: string;
}

/**
 * Profile validator - validates profile configurations
 */
export class ProfileValidator {
  /**
   * Validate a profile
   */
  async validate(
    profile: Profile,
    options: ProfileValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Required fields
    this.validateRequiredFields(profile, errors);

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // SSH port validation
    this.validateSSHPort(profile, errors);

    // Local directory validation
    if (options.checkLocalDirectory !== false) {
      await this.validateLocalDirectory(profile, options.workspaceFolder, errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Quick validation without async checks
   */
  validateSync(profile: Profile): ValidationResult {
    const errors: string[] = [];

    this.validateRequiredFields(profile, errors);
    this.validateSSHPort(profile, errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateRequiredFields(profile: Profile, errors: string[]): void {
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
  }

  private validateSSHPort(profile: Profile, errors: string[]): void {
    if (profile.sshPort !== undefined) {
      if (!Number.isInteger(profile.sshPort) ||
          profile.sshPort < 1 ||
          profile.sshPort > 65535) {
        errors.push('SSH port must be a valid port number (1-65535)');
      }
    }
  }

  private async validateLocalDirectory(
    profile: Profile,
    workspaceFolder: string | undefined,
    errors: string[]
  ): Promise<void> {
    let localDir = profile.localDir;

    // Resolve workspace folder variable
    if (workspaceFolder) {
      localDir = PathUtils.resolveWorkspaceFolder(localDir, workspaceFolder);
    }

    // Check existence
    const exists = await PathUtils.exists(localDir);
    if (!exists) {
      errors.push(`Local directory does not exist: ${localDir}`);
      return;
    }

    // Check if it's a directory
    const isDir = await PathUtils.isDirectory(localDir);
    if (!isDir) {
      errors.push(`Local path is not a directory: ${localDir}`);
      return;
    }

    // Check if it's readable
    const isReadable = await PathUtils.isReadable(localDir);
    if (!isReadable) {
      errors.push(`Local directory is not readable: ${localDir}`);
    }
  }

  /**
   * Create error from validation result
   */
  toError(result: ValidationResult): ConfigurationError | null {
    if (result.valid) {
      return null;
    }
    return new ConfigurationError('validation', result.errors.join('; '));
  }
}
