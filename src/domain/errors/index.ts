// Base error
import { SyncErrorBase } from './SyncErrorBase';
export { SyncErrorBase } from './SyncErrorBase';

// Connection errors
export {
  ConnectionError,
  AuthenticationError,
  ConnectionTimeoutError
} from './ConnectionError';

// Configuration errors
export {
  ConfigurationError,
  ProfileNotFoundError,
  LocalDirectoryError,
  RemoteDirectoryError
} from './ConfigurationError';

// Rsync errors
export {
  RsyncError,
  RsyncNotFoundError,
  RSYNC_EXIT_CODES
} from './RsyncError';

// Watcher errors
export {
  InotifyNotFoundError,
  WatcherProcessError,
  WatchTargetError
} from './WatcherError';

// Type guard for SyncErrorBase
export function isSyncError(error: unknown): error is SyncErrorBase {
  return error instanceof SyncErrorBase;
}

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
