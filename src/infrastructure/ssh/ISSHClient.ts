import { SSHConfig, ConnectionResult } from '../../core/types';

/**
 * Execution result from SSH command
 */
export interface SSHExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * SSH validation result with detailed information
 */
export interface SSHValidationResult {
  connected: boolean;
  remoteDirectoryExists: boolean;
  hasWritePermission: boolean;
  errors: string[];
}

/**
 * SSH client interface for dependency injection
 */
export interface ISSHClient {
  /**
   * Test SSH connection
   */
  testConnection(config: SSHConfig): Promise<ConnectionResult>;

  /**
   * Execute a command on remote host
   */
  execute(config: SSHConfig, command: string): Promise<SSHExecutionResult>;

  /**
   * Validate full SSH setup including directory and permissions
   */
  validateSetup(config: SSHConfig, remoteDir: string): Promise<SSHValidationResult>;
}
