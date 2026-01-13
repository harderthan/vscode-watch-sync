import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { SpawnArgs } from '../types';

/**
 * Result of a process execution
 */
export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
}

/**
 * Options for process execution
 */
export interface ExecuteOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  shell?: boolean;
}

/**
 * Process management utilities
 */
export class ProcessUtils {
  /**
   * Execute a command and wait for completion
   * Uses spawn (not exec) to avoid shell injection
   */
  static async execute(
    command: string,
    args: string[],
    options: ExecuteOptions = {}
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        cwd: options.cwd,
        env: options.env || process.env,
        shell: options.shell ?? false,  // Default to no shell for security
      };

      const proc = spawn(command, args, spawnOptions);

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          killed = true;
          proc.kill('SIGTERM');
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill('SIGKILL');
            }
          }, 5000);
        }, options.timeout);
      }

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code, signal) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (killed) {
          reject(new Error(`Process timed out after ${options.timeout}ms`));
        } else {
          resolve({
            exitCode: code ?? -1,
            stdout,
            stderr,
            signal
          });
        }
      });

      proc.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  }

  /**
   * Execute from SpawnArgs object
   */
  static async executeFromArgs(
    spawnArgs: SpawnArgs,
    options: ExecuteOptions = {}
  ): Promise<ProcessResult> {
    return this.execute(
      spawnArgs.command,
      spawnArgs.args,
      { ...options, cwd: spawnArgs.cwd || options.cwd }
    );
  }

  /**
   * Kill a process with timeout
   * First sends SIGTERM, then SIGKILL if process doesn't exit
   */
  static async killProcess(
    proc: ChildProcess,
    timeoutMs = 5000
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (proc.killed || proc.exitCode !== null) {
        resolve(true);
        return;
      }

      let resolved = false;

      const onExit = () => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      };

      proc.once('exit', onExit);
      proc.once('close', onExit);

      // Send SIGTERM first
      proc.kill('SIGTERM');

      // Set up SIGKILL timeout
      setTimeout(() => {
        if (!resolved && !proc.killed) {
          proc.kill('SIGKILL');
          // Give it a moment to actually die
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(proc.killed);
            }
          }, 1000);
        }
      }, timeoutMs);
    });
  }

  /**
   * Check if a command exists in PATH
   */
  static async commandExists(command: string): Promise<boolean> {
    try {
      const result = await this.execute('which', [command]);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the version of a command
   */
  static async getCommandVersion(
    command: string,
    versionFlag = '--version'
  ): Promise<string | null> {
    try {
      const result = await this.execute(command, [versionFlag]);
      if (result.exitCode === 0) {
        return result.stdout.trim() || result.stderr.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}
