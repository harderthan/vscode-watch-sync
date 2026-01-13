import { spawn } from 'child_process';
import { IRsyncClient, IRsyncCommandBuilder, SyncJob, DryRunResult } from './IRsyncClient';
import { SyncResult } from '../../core/types';
import { ProcessUtils } from '../../core/utils/ProcessUtils';
import { ILogger } from '../../core/logger/ILogger';
import { PathUtils } from '../../core/utils/PathUtils';

const SYNC_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Rsync client implementation
 */
export class RsyncClient implements IRsyncClient {
  private env: NodeJS.ProcessEnv | undefined;

  constructor(
    private readonly logger: ILogger,
    private readonly commandBuilder: IRsyncCommandBuilder
  ) {}

  /**
   * Set environment variables for rsync subprocess
   * Used for SSH_ASKPASS authentication
   */
  setEnv(env: NodeJS.ProcessEnv | undefined): void {
    this.env = env;
  }

  async sync(job: SyncJob): Promise<SyncResult> {
    const startTime = Date.now();

    this.logger.info('Rsync', `Starting ${job.strategy} sync for ${job.profile.alias}`);

    try {
      let result;

      if (job.strategy === 'incremental' && job.files.length > 0) {
        result = await this.executeIncrementalSync(job);
      } else {
        result = await this.executeFullSync(job);
      }

      const duration = Date.now() - startTime;

      if (result.exitCode === 0) {
        this.logger.info('Rsync', `Sync completed in ${duration}ms`);
        return {
          success: true,
          jobId: job.id,
          filesTransferred: this.parseFilesTransferred(result.stdout),
          bytesTransferred: this.parseBytesTransferred(result.stdout),
          duration,
          errors: []
        };
      }

      const errors = this.parseErrors(result.stderr, result.exitCode);
      this.logger.error('Rsync', `Sync failed: ${errors.join(', ')}`);

      return {
        success: false,
        jobId: job.id,
        filesTransferred: 0,
        bytesTransferred: 0,
        duration,
        errors
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Rsync', `Sync exception: ${message}`);

      return {
        success: false,
        jobId: job.id,
        filesTransferred: 0,
        bytesTransferred: 0,
        duration: Date.now() - startTime,
        errors: [message]
      };
    }
  }

  async dryRun(job: SyncJob): Promise<DryRunResult> {
    const spawnArgs = this.commandBuilder.buildDryRun(job.profile);

    const result = await ProcessUtils.execute(
      spawnArgs.command,
      spawnArgs.args,
      { timeout: 60000, env: this.env }
    );

    return this.parseDryRunOutput(result.stdout);
  }

  async isAvailable(): Promise<boolean> {
    return ProcessUtils.commandExists('rsync');
  }

  private async executeFullSync(job: SyncJob) {
    const spawnArgs = this.commandBuilder.buildFullSync(job.profile);

    this.logger.debug('Rsync', `Command: ${spawnArgs.command} ${spawnArgs.args.join(' ')}`);

    return ProcessUtils.execute(
      spawnArgs.command,
      spawnArgs.args,
      { timeout: SYNC_TIMEOUT_MS, env: this.env }
    );
  }

  private async executeIncrementalSync(job: SyncJob): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const spawnArgs = this.commandBuilder.buildIncrementalSync(job.profile, job.files);

    this.logger.debug('Rsync', `Incremental sync: ${job.files.length} files`);

    // For incremental sync, we need to pipe the file list to stdin
    return new Promise((resolve, reject) => {
      const proc = spawn(spawnArgs.command, spawnArgs.args, {
        cwd: spawnArgs.cwd,
        shell: false,
        env: { ...process.env, ...(this.env || {}) }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr
        });
      });

      proc.on('error', reject);

      // Write file list to stdin (relative paths)
      const relativePaths = job.files.map(f =>
        PathUtils.getRelativePath(job.profile.localDir, f)
      );
      proc.stdin?.write(relativePaths.join('\n'));
      proc.stdin?.end();
    });
  }

  private parseFilesTransferred(stdout: string): number {
    // rsync outputs: "Number of files transferred: X"
    const match = stdout.match(/Number of (?:regular )?files transferred:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseBytesTransferred(stdout: string): number {
    // rsync outputs: "Total transferred file size: X bytes"
    const match = stdout.match(/Total transferred file size:\s*([\d,]+)/i);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return 0;
  }

  private parseErrors(stderr: string, exitCode: number): string[] {
    const errors: string[] = [];

    if (stderr.trim()) {
      errors.push(stderr.trim());
    }

    // Add human-readable exit code meaning
    const exitCodeMeaning = this.getExitCodeMeaning(exitCode);
    if (exitCodeMeaning) {
      errors.push(exitCodeMeaning);
    }

    return errors;
  }

  private getExitCodeMeaning(code: number): string | null {
    const meanings: Record<number, string> = {
      1: 'Syntax or usage error',
      2: 'Protocol incompatibility',
      3: 'Errors selecting input/output files',
      4: 'Requested action not supported',
      5: 'Error starting client-server protocol',
      10: 'Error in socket I/O',
      11: 'Error in file I/O',
      12: 'Error in rsync protocol data stream',
      13: 'Errors with program diagnostics',
      14: 'Error in IPC code',
      20: 'Received SIGUSR1 or SIGINT',
      21: 'Some error returned by waitpid()',
      22: 'Error allocating core memory buffers',
      23: 'Partial transfer due to error',
      24: 'Partial transfer due to vanished source files',
      25: 'The --max-delete limit stopped deletions',
      30: 'Timeout in data send/receive',
      35: 'Timeout waiting for daemon connection'
    };

    return meanings[code] || null;
  }

  private parseDryRunOutput(stdout: string): DryRunResult {
    const lines = stdout.split('\n').filter(l => l.trim());
    const filesToTransfer: string[] = [];
    const filesToDelete: string[] = [];

    for (const line of lines) {
      if (line.startsWith('deleting ')) {
        filesToDelete.push(line.replace('deleting ', ''));
      } else if (!line.startsWith('sending ') && !line.startsWith('total ')) {
        filesToTransfer.push(line);
      }
    }

    return {
      filesToTransfer,
      filesToDelete,
      totalBytes: 0 // Would need stats parsing for accurate value
    };
  }
}
