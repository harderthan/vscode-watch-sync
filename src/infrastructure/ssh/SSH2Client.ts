import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ILogger } from '../../core/logger/ILogger';
import { SSHConfig, ConnectionResult } from '../../core/types';
import { ISSHClient, SSHExecutionResult, SSHValidationResult } from './ISSHClient';

/**
 * SSH2-based client for connection testing and password management
 * Uses pure Node.js ssh2 library instead of system ssh/sshpass
 */
export class SSH2Client implements ISSHClient {
  private password: string | null = null;
  private askpassScriptPath: string | null = null;

  constructor(private readonly logger: ILogger) {}

  /**
   * Set password for authentication
   */
  setPassword(password: string | null): void {
    this.password = password;
    this.updateAskpassScript();
  }

  /**
   * Get password
   */
  getPassword(): string | null {
    return this.password;
  }

  /**
   * Check if password is set
   */
  hasPassword(): boolean {
    return this.password !== null;
  }

  /**
   * Get SSH_ASKPASS script path for rsync
   */
  getAskpassScriptPath(): string | null {
    return this.askpassScriptPath;
  }

  /**
   * Test SSH connection using ssh2 library
   */
  async testConnection(config: SSHConfig): Promise<ConnectionResult> {
    const startTime = Date.now();

    try {
      const client = await this.createConnection(config);
      const latencyMs = Date.now() - startTime;

      // Execute a simple command to verify
      await this.executeCommand(client, 'echo ok');

      client.end();

      this.logger.info('SSH2', `Connection successful to ${config.host} (${latencyMs}ms)`);
      return { success: true, latencyMs };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('SSH2', `Connection failed to ${config.host}: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Execute a command over SSH
   */
  async execute(config: SSHConfig, command: string): Promise<SSHExecutionResult> {
    try {
      const client = await this.createConnection(config);
      const result = await this.executeCommand(client, command);
      client.end();
      return result;
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

  /**
   * Validate SSH setup (connection, directory, permissions)
   */
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

    this.logger.info('SSH2', `Validation complete for ${config.host}: connected=${connected}, dirExists=${remoteDirectoryExists}, writable=${hasWritePermission}`);

    return {
      connected,
      remoteDirectoryExists,
      hasWritePermission,
      errors
    };
  }

  /**
   * Get environment variables for rsync/ssh subprocess
   * Uses SSH_ASKPASS mechanism for password authentication
   */
  getEnvForSubprocess(): NodeJS.ProcessEnv {
    const env = { ...process.env };

    if (this.password && this.askpassScriptPath) {
      env.SSH_ASKPASS = this.askpassScriptPath;
      env.SSH_ASKPASS_REQUIRE = 'force';
      // DISPLAY must be set for SSH_ASKPASS to work
      env.DISPLAY = env.DISPLAY || ':0';
    }

    return env;
  }

  /**
   * Create SSH connection with password or key authentication
   */
  private createConnection(config: SSHConfig): Promise<Client> {
    return new Promise((resolve, reject) => {
      const client = new Client();

      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.user,
        readyTimeout: 10000,
      };

      // Use password if set
      if (this.password) {
        connectConfig.password = this.password;
      }

      // Use identity file if specified
      if (config.identityFile) {
        try {
          connectConfig.privateKey = fs.readFileSync(config.identityFile);
        } catch (err) {
          this.logger.warn('SSH2', `Failed to read identity file: ${config.identityFile}`);
        }
      }

      // If no password and no identity file, try default keys
      if (!this.password && !config.identityFile) {
        const defaultKeyPaths = [
          path.join(os.homedir(), '.ssh', 'id_rsa'),
          path.join(os.homedir(), '.ssh', 'id_ed25519'),
          path.join(os.homedir(), '.ssh', 'id_ecdsa'),
        ];

        for (const keyPath of defaultKeyPaths) {
          try {
            if (fs.existsSync(keyPath)) {
              connectConfig.privateKey = fs.readFileSync(keyPath);
              this.logger.debug('SSH2', `Using key: ${keyPath}`);
              break;
            }
          } catch (err) {
            this.logger.debug('SSH2', `Could not read key ${keyPath}: ${err}`);
          }
        }
      }

      client.on('ready', () => {
        this.logger.debug('SSH2', `Connected to ${config.host}`);
        resolve(client);
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.connect(connectConfig);
    });
  }

  /**
   * Execute command on SSH client
   */
  private executeCommand(client: Client, command: string): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          resolve({
            success: code === 0,
            stdout,
            stderr,
            exitCode: code
          });
        });
      });
    });
  }

  /**
   * Create SSH_ASKPASS script that echoes the password
   * This is used for rsync to get password without sshpass
   */
  private updateAskpassScript(): void {
    if (!this.password) {
      this.cleanupAskpassScript();
      return;
    }

    try {
      const tmpDir = os.tmpdir();
      this.askpassScriptPath = path.join(tmpDir, `watch-sync-askpass-${process.pid}.sh`);

      // Create script that echoes the password
      // Using base64 to avoid shell escaping issues
      const encodedPassword = Buffer.from(this.password).toString('base64');
      const scriptContent = `#!/bin/bash\necho "$(echo '${encodedPassword}' | base64 -d)"\n`;

      fs.writeFileSync(this.askpassScriptPath, scriptContent, { mode: 0o700 });
      this.logger.debug('SSH2', `Created askpass script: ${this.askpassScriptPath}`);

    } catch (err) {
      this.logger.error('SSH2', `Failed to create askpass script: ${err}`);
      this.askpassScriptPath = null;
    }
  }

  /**
   * Cleanup askpass script
   */
  private cleanupAskpassScript(): void {
    if (this.askpassScriptPath) {
      try {
        if (fs.existsSync(this.askpassScriptPath)) {
          fs.unlinkSync(this.askpassScriptPath);
        }
      } catch {
        // Ignore cleanup errors
      }
      this.askpassScriptPath = null;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cleanupAskpassScript();
  }
}
