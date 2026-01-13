import { SyncErrorBase } from './SyncErrorBase';

/**
 * Error thrown when SSH connection fails
 */
export class ConnectionError extends SyncErrorBase {
  readonly code = 'CONNECTION_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly host: string,
    public readonly port: number,
    message?: string,
    cause?: Error
  ) {
    super(message || `Failed to connect to ${host}:${port}`, cause);
  }
}

/**
 * Error thrown when SSH authentication fails
 */
export class AuthenticationError extends SyncErrorBase {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly host: string,
    public readonly user: string,
    cause?: Error
  ) {
    super(`Authentication failed for ${user}@${host}`, cause);
  }
}

/**
 * Error thrown when connection times out
 */
export class ConnectionTimeoutError extends SyncErrorBase {
  readonly code = 'CONNECTION_TIMEOUT';
  readonly recoverable = true;

  constructor(
    public readonly host: string,
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(`Connection to ${host} timed out after ${timeoutMs}ms`, cause);
  }
}
