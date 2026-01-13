import { SyncResult } from '../../../core/types';
import { SyncJob } from '../../entities/SyncJob';

/**
 * Sync strategy interface
 */
export interface ISyncStrategy {
  /**
   * Strategy name
   */
  readonly name: string;

  /**
   * Execute synchronization
   */
  execute(job: SyncJob): Promise<SyncResult>;

  /**
   * Check if this strategy can handle the job
   */
  canHandle(job: SyncJob): boolean;
}
