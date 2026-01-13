import { SyncResult, SpawnArgs } from '../../core/types';
import { ProfileConfig } from '../config/IConfigurationProvider';

/**
 * Sync job definition
 */
export interface SyncJob {
  id: string;
  profile: ProfileConfig;
  files: string[];
  strategy: 'full' | 'incremental';
}

/**
 * Dry run result showing what would be synced
 */
export interface DryRunResult {
  filesToTransfer: string[];
  filesToDelete: string[];
  totalBytes: number;
}

/**
 * Rsync client interface for dependency injection
 */
export interface IRsyncClient {
  /**
   * Perform synchronization
   */
  sync(job: SyncJob): Promise<SyncResult>;

  /**
   * Perform dry run to see what would change
   */
  dryRun(job: SyncJob): Promise<DryRunResult>;

  /**
   * Check if rsync is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Rsync command builder interface
 */
export interface IRsyncCommandBuilder {
  /**
   * Build rsync command arguments for full sync
   */
  buildFullSync(profile: ProfileConfig): SpawnArgs;

  /**
   * Build rsync command arguments for incremental sync
   */
  buildIncrementalSync(profile: ProfileConfig, files: string[]): SpawnArgs;

  /**
   * Build rsync command for dry run
   */
  buildDryRun(profile: ProfileConfig): SpawnArgs;
}
