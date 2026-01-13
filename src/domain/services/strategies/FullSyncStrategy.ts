import { ISyncStrategy } from './ISyncStrategy';
import { SyncResult } from '../../../core/types';
import { SyncJob } from '../../entities/SyncJob';
import { IRsyncClient, SyncJob as RsyncSyncJob } from '../../../infrastructure/sync/IRsyncClient';
import { ILogger } from '../../../core/logger/ILogger';

/**
 * Full directory synchronization strategy
 */
export class FullSyncStrategy implements ISyncStrategy {
  readonly name = 'full';

  constructor(
    private readonly rsyncClient: IRsyncClient,
    private readonly logger: ILogger
  ) {}

  async execute(job: SyncJob): Promise<SyncResult> {
    this.logger.info('FullSync', `Starting full sync for ${job.profile.alias}`);

    const rsyncJob: RsyncSyncJob = {
      id: job.id,
      profile: job.profile.toPlainObject(),
      files: [],
      strategy: 'full'
    };

    return this.rsyncClient.sync(rsyncJob);
  }

  canHandle(job: SyncJob): boolean {
    // Full sync can handle any job, but prefers jobs without specific files
    return job.files.length === 0 || job.strategy === 'full';
  }
}
