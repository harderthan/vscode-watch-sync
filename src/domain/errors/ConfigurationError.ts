import { SyncErrorBase } from './SyncErrorBase';

/**
 * Error thrown when profile configuration is invalid
 */
export class ConfigurationError extends SyncErrorBase {
  readonly code = 'CONFIGURATION_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly field: string,
    message: string,
    cause?: Error
  ) {
    super(message, cause);
  }
}

/**
 * Error thrown when a profile is not found
 */
export class ProfileNotFoundError extends SyncErrorBase {
  readonly code = 'PROFILE_NOT_FOUND';
  readonly recoverable = false;

  constructor(public readonly alias: string) {
    super(`Profile not found: ${alias}`);
  }
}

/**
 * Error thrown when local directory doesn't exist or is inaccessible
 */
export class LocalDirectoryError extends SyncErrorBase {
  readonly code = 'LOCAL_DIRECTORY_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly path: string,
    public readonly reason: 'not_found' | 'not_directory' | 'not_readable',
    cause?: Error
  ) {
    const messages = {
      not_found: `Local directory not found: ${path}`,
      not_directory: `Path is not a directory: ${path}`,
      not_readable: `Cannot read directory: ${path}`
    };
    super(messages[reason], cause);
  }
}

/**
 * Error thrown when remote directory doesn't exist or is inaccessible
 */
export class RemoteDirectoryError extends SyncErrorBase {
  readonly code = 'REMOTE_DIRECTORY_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly path: string,
    public readonly host: string,
    public readonly reason: 'not_found' | 'not_directory' | 'not_writable',
    cause?: Error
  ) {
    const messages = {
      not_found: `Remote directory not found: ${host}:${path}`,
      not_directory: `Remote path is not a directory: ${host}:${path}`,
      not_writable: `Cannot write to remote directory: ${host}:${path}`
    };
    super(messages[reason], cause);
  }
}
