import { SyncErrorBase } from './SyncErrorBase';

/**
 * rsync exit codes and their meanings
 */
export const RSYNC_EXIT_CODES: Record<number, string> = {
  0: 'Success',
  1: 'Syntax or usage error',
  2: 'Protocol incompatibility',
  3: 'Errors selecting input/output files, dirs',
  4: 'Requested action not supported',
  5: 'Error starting client-server protocol',
  6: 'Daemon unable to append to log-file',
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

/**
 * Recoverable rsync exit codes (can retry)
 */
const RECOVERABLE_EXIT_CODES = [12, 23, 24, 30, 35];

/**
 * Error thrown when rsync command fails
 */
export class RsyncError extends SyncErrorBase {
  readonly code = 'RSYNC_ERROR';
  readonly recoverable: boolean;

  constructor(
    public readonly exitCode: number,
    public readonly stderr: string,
    cause?: Error
  ) {
    const description = RSYNC_EXIT_CODES[exitCode] || 'Unknown error';
    super(`rsync failed (exit code ${exitCode}): ${description}`, cause);
    this.recoverable = RECOVERABLE_EXIT_CODES.includes(exitCode);
  }

  get exitCodeDescription(): string {
    return RSYNC_EXIT_CODES[this.exitCode] || 'Unknown error';
  }
}

/**
 * Error thrown when rsync is not installed
 */
export class RsyncNotFoundError extends SyncErrorBase {
  readonly code = 'RSYNC_NOT_FOUND';
  readonly recoverable = false;

  constructor() {
    super('rsync is not installed or not in PATH');
  }
}
