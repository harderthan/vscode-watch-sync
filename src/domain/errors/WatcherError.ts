import { SyncErrorBase } from './SyncErrorBase';

/**
 * Error thrown when inotifywait is not installed
 */
export class InotifyNotFoundError extends SyncErrorBase {
  readonly code = 'INOTIFY_NOT_FOUND';
  readonly recoverable = false;

  constructor() {
    super('inotifywait is not installed. Install inotify-tools package.');
  }
}

/**
 * Error thrown when watcher process fails
 */
export class WatcherProcessError extends SyncErrorBase {
  readonly code = 'WATCHER_PROCESS_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly exitCode: number,
    public readonly stderr: string,
    cause?: Error
  ) {
    super(`inotifywait process failed (exit code ${exitCode}): ${stderr}`, cause);
  }
}

/**
 * Error thrown when watch target doesn't exist
 */
export class WatchTargetError extends SyncErrorBase {
  readonly code = 'WATCH_TARGET_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly path: string,
    cause?: Error
  ) {
    super(`Cannot watch path: ${path}`, cause);
  }
}
