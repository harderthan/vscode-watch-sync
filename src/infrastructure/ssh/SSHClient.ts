import { ISSHClient, SSHExecutionResult, SSHValidationResult } from './ISSHClient';
import { SSHConfig, ConnectionResult } from '../../core/types';
import { ProcessUtils } from '../../core/utils/ProcessUtils';
import { ILogger } from '../../core/logger/ILogger';

const CONNECTION_TIMEOUT_MS = 10000;

/**
 * SSH client implementation using system ssh command
 */
export class SSHClient implements ISSHClient {
  private password: string | null = null;

  constructor(private readonly logger: ILogger) {}

  /**
   * Set password for subsequent SSH commands
   */
  setPassword(password: string | null): void {
    this.password = password;
  }

  /**
   * Check if password is set
   */
  hasPassword(): boolean {
    return this.password !== null;
  }

  async testConnection(config: SSHConfig): Promise<ConnectionResult> {
    const startTime = Date.now();

    try {
      const { command, args } = this.buildCommand(config, 'echo ok');

      const result = await ProcessUtils.execute(command, args, {
        timeout: CONNECTION_TIMEOUT_MS,
        env: this.getEnv()
      });

      if (result.exitCode === 0 && result.stdout.trim() === 'ok') {
        const latencyMs = Date.now() - startTime;
        this.logger.info('SSH', `Connection successful to ${config.host} (${latencyMs}ms)`);
        return { success: true, latencyMs };
      }

      return {
        success: false,
        error: result.stderr || `SSH exited with code ${result.exitCode}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('SSH', `Connection failed to ${config.host}: ${message}`);
      return { success: false, error: message };
    }
  }

  async execute(config: SSHConfig, remoteCommand: string): Promise<SSHExecutionResult> {
    try {
      const { command, args } = this.buildCommand(config, remoteCommand);

      const result = await ProcessUtils.execute(command, args, {
        timeout: 60000, // 1 minute timeout for general commands
        env: this.getEnv()
      });

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        stdout: '',
        stderr: message,
        exitCode: -1
      };
    }
  }

  async validateSetup(config: SSHConfig, remoteDir: string): Promise<SSHValidationResult> {
    const errors: string[] = [];
    let connected = false;
    let remoteDirectoryExists = false;
    let hasWritePermission = false;

    // Test connection
    const connectionResult = await this.testConnection(config);
    if (!connectionResult.success) {
      errors.push(`SSH connection failed: ${connectionResult.error}`);
      return { connected, remoteDirectoryExists, hasWritePermission, errors };
    }
    connected = true;

    // Check remote directory exists
    const dirCheckResult = await this.execute(config, `test -d "${remoteDir}" && echo exists`);
    if (dirCheckResult.success && dirCheckResult.stdout.trim() === 'exists') {
      remoteDirectoryExists = true;
    } else {
      errors.push(`Remote directory does not exist: ${remoteDir}`);
    }

    // Check write permission
    if (remoteDirectoryExists) {
      const testFile = `${remoteDir}/.watch_sync_test_${Date.now()}`;
      const writeResult = await this.execute(
        config,
        `touch "${testFile}" && rm "${testFile}" && echo writable`
      );

      if (writeResult.success && writeResult.stdout.trim() === 'writable') {
        hasWritePermission = true;
      } else {
        errors.push(`No write permission on remote directory: ${remoteDir}`);
      }
    }

    this.logger.info('SSH', `Validation complete for ${config.host}: connected=${connected}, dirExists=${remoteDirectoryExists}, writable=${hasWritePermission}`);

    return {
      connected,
      remoteDirectoryExists,
      hasWritePermission,
      errors
    };
  }

  private buildSSHArgs(config: SSHConfig, remoteCommand: string): string[] {
    const args: string[] = [
      '-o', 'StrictHostKeyChecking=accept-new',
      '-o', 'ConnectTimeout=10',
      '-p', String(config.port),
    ];

    // Only use BatchMode when NOT using password auth
    if (!this.password) {
      args.push('-o', 'BatchMode=yes');
    }

    if (config.identityFile) {
      args.push('-i', config.identityFile);
    }

    args.push(`${config.user}@${config.host}`);
    args.push(remoteCommand);

    return args;
  }

  /**
   * Build command with optional sshpass wrapper
   */
  private buildCommand(config: SSHConfig, remoteCommand: string): { command: string; args: string[] } {
    const sshArgs = this.buildSSHArgs(config, remoteCommand);

    if (this.password) {
      // Use sshpass with -e flag (read password from SSHPASS env var)
      return {
        command: 'sshpass',
        args: ['-e', 'ssh', ...sshArgs]
      };
    }

    return {
      command: 'ssh',
      args: sshArgs
    };
  }

  /**
   * Get environment variables for process execution
   */
  private getEnv(): NodeJS.ProcessEnv | undefined {
    if (this.password) {
      return {
        ...process.env,
        SSHPASS: this.password
      };
    }
    return undefined;
  }
}
