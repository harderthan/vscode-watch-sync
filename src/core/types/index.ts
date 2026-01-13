/**
 * Core types for Watch Sync extension
 */

// File change event types
export type FileChangeType = 'create' | 'modify' | 'delete' | 'move';

// Sync direction
export type SyncDirection = 'localToRemote' | 'remoteToLocal' | 'bidirectional';

// Conflict resolution policy
export type ConflictPolicy = 'localWins' | 'remoteWins' | 'newest' | 'manual';

// Sync state machine states
export type SyncState =
  | 'idle'
  | 'initializing'
  | 'connecting'
  | 'watching'
  | 'syncing'
  | 'error'
  | 'recovering';

// File change event
export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: Date;
  oldPath?: string; // For move events
}

// Watch configuration
export interface WatchConfig {
  targetPath: string;
  excludePatterns: string[];
  debounceMs: number;
}

// SSH configuration
export interface SSHConfig {
  host: string;
  user: string;
  port: number;
  identityFile?: string;
}

// Sync job configuration
export interface SyncJobConfig {
  id: string;
  profileAlias: string;
  files: string[];
  strategy: 'full' | 'incremental';
  timestamp: Date;
}

// Sync result
export interface SyncResult {
  success: boolean;
  jobId: string;
  filesTransferred: number;
  bytesTransferred: number;
  duration: number;
  errors: string[];
}

// Connection test result
export interface ConnectionResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Command execution args (for spawn)
export interface SpawnArgs {
  command: string;
  args: string[];
  cwd?: string;
}
