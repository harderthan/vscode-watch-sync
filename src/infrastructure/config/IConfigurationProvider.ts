import { ValidationResult, SyncDirection, ConflictPolicy } from '../../core/types';

/**
 * Profile configuration interface
 */
export interface ProfileConfig {
  alias: string;
  remoteUser: string;
  remoteHost: string;
  remoteDir: string;
  localDir: string;
  sshPort: number;
  direction: SyncDirection;
  conflictPolicy: ConflictPolicy;
  exclude: string[];
}

/**
 * Configuration provider interface for dependency injection
 */
export interface IConfigurationProvider {
  /**
   * Get all configured profiles
   */
  getProfiles(): ProfileConfig[];

  /**
   * Get a specific profile by alias
   */
  getProfile(alias: string): ProfileConfig | undefined;

  /**
   * Add or update a profile
   */
  addProfile(profile: ProfileConfig): Promise<void>;

  /**
   * Delete a profile
   */
  deleteProfile(alias: string): Promise<boolean>;

  /**
   * Get the auto-start profile alias
   */
  getAutoStartProfile(): string | undefined;

  /**
   * Set the auto-start profile alias
   */
  setAutoStartProfile(alias: string | undefined): Promise<void>;

  /**
   * Validate a profile configuration
   */
  validate(profile: ProfileConfig): Promise<ValidationResult>;

  /**
   * Resolve variables in profile paths (e.g., ${workspaceFolder})
   */
  resolveVariables(profile: ProfileConfig): ProfileConfig;
}
