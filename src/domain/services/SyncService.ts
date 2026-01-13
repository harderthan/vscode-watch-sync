import { SyncResult } from '../../core/types';
import { ILogger } from '../../core/logger/ILogger';
import { SyncJob } from '../entities/SyncJob';
import { Profile } from '../entities/Profile';
import { ISyncStrategy, FullSyncStrategy, IncrementalSyncStrategy } from './strategies';
import { IRsyncClient } from '../../infrastructure/sync/IRsyncClient';

/**
 * Sync service - coordinates synchronization operations
 */
export class SyncService {
  private readonly strategies: ISyncStrategy[];

  constructor(
    rsyncClient: IRsyncClient,
    private readonly logger: ILogger
  ) {
    // Initialize strategies in order of preference
    this.strategies = [
      new IncrementalSyncStrategy(rsyncClient, logger),
      new FullSyncStrategy(rsyncClient, logger)
    ];
  }

  /**
   * Execute a sync job
   */
  async sync(job: SyncJob): Promise<SyncResult> {
    const strategy = this.selectStrategy(job);

    this.logger.info('SyncService', `Using ${strategy.name} strategy for job ${job.id}`);

    job.start();

    try {
      const result = await strategy.execute(job);

      if (result.success) {
        job.complete(result.filesTransferred, result.bytesTransferred);
      } else {
        job.fail(result.errors.join('; '));
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      job.fail(message);

      return {
        success: false,
        jobId: job.id,
        filesTransferred: 0,
        bytesTransferred: 0,
        duration: job.duration,
        errors: [message]
      };
    }
  }

  /**
   * Create a full sync job
   */
  createFullSyncJob(profile: Profile): SyncJob {
    return new SyncJob({
      id: SyncJob.generateId(),
      profile,
      strategy: 'full'
    });
  }

  /**
   * Create an incremental sync job for specific files
   */
  createIncrementalSyncJob(profile: Profile, files: string[]): SyncJob {
    return new SyncJob({
      id: SyncJob.generateId(),
      profile,
      files,
      strategy: 'incremental'
    });
  }

  private selectStrategy(job: SyncJob): ISyncStrategy {
    // Find first strategy that can handle the job
    for (const strategy of this.strategies) {
      if (strategy.canHandle(job)) {
        return strategy;
      }
    }

    // Fallback to full sync (always available)
    return this.strategies[this.strategies.length - 1];
  }
}
