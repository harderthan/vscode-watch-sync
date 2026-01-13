import { ISyncStrategy } from './ISyncStrategy';
import { SyncResult } from '../../../core/types';
import { SyncJob } from '../../entities/SyncJob';
import { IRsyncClient, SyncJob as RsyncSyncJob } from '../../../infrastructure/sync/IRsyncClient';
import { ILogger } from '../../../core/logger/ILogger';

/**
 * Incremental synchronization strategy - syncs only changed files
 */
export class IncrementalSyncStrategy implements ISyncStrategy {
  readonly name = 'incremental';

  constructor(
    private readonly rsyncClient: IRsyncClient,
    private readonly logger: ILogger
  ) {}

  async execute(job: SyncJob): Promise<SyncResult> {
    if (job.files.length === 0) {
      this.logger.warn('IncrementalSync', 'No files specified, falling back to full sync');
      return this.executeFallbackFullSync(job);
    }

    this.logger.info('IncrementalSync', `Syncing ${job.files.length} files for ${job.profile.alias}`);

    const rsyncJob: RsyncSyncJob = {
      id: job.id,
      profile: job.profile.toPlainObject(),
      files: [...job.files],
      strategy: 'incremental'
    };

    return this.rsyncClient.sync(rsyncJob);
  }

  canHandle(job: SyncJob): boolean {
    return job.files.length > 0 && job.strategy === 'incremental';
  }

  private async executeFallbackFullSync(job: SyncJob): Promise<SyncResult> {
    const rsyncJob: RsyncSyncJob = {
      id: job.id,
      profile: job.profile.toPlainObject(),
      files: [],
      strategy: 'full'
    };

    return this.rsyncClient.sync(rsyncJob);
  }
}
