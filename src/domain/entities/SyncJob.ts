import { Profile } from './Profile';

export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SyncStrategy = 'full' | 'incremental';

/**
 * Sync job entity - represents a single synchronization operation
 */
export class SyncJob {
  readonly id: string;
  readonly profile: Profile;
  readonly files: readonly string[];
  readonly strategy: SyncStrategy;
  readonly createdAt: Date;

  private _status: SyncJobStatus = 'pending';
  private _startedAt?: Date;
  private _completedAt?: Date;
  private _error?: string;
  private _filesTransferred = 0;
  private _bytesTransferred = 0;

  constructor(params: {
    id: string;
    profile: Profile;
    files?: string[];
    strategy?: SyncStrategy;
  }) {
    this.id = params.id;
    this.profile = params.profile;
    this.files = Object.freeze([...(params.files ?? [])]);
    this.strategy = params.strategy ?? (params.files && params.files.length > 0 ? 'incremental' : 'full');
    this.createdAt = new Date();
  }

  get status(): SyncJobStatus {
    return this._status;
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get error(): string | undefined {
    return this._error;
  }

  get filesTransferred(): number {
    return this._filesTransferred;
  }

  get bytesTransferred(): number {
    return this._bytesTransferred;
  }

  get duration(): number {
    if (!this._startedAt) return 0;
    const end = this._completedAt ?? new Date();
    return end.getTime() - this._startedAt.getTime();
  }

  /**
   * Mark job as started
   */
  start(): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot start job in ${this._status} status`);
    }
    this._status = 'running';
    this._startedAt = new Date();
  }

  /**
   * Mark job as completed successfully
   */
  complete(filesTransferred: number, bytesTransferred: number): void {
    if (this._status !== 'running') {
      throw new Error(`Cannot complete job in ${this._status} status`);
    }
    this._status = 'completed';
    this._completedAt = new Date();
    this._filesTransferred = filesTransferred;
    this._bytesTransferred = bytesTransferred;
  }

  /**
   * Mark job as failed
   */
  fail(error: string): void {
    if (this._status !== 'running') {
      throw new Error(`Cannot fail job in ${this._status} status`);
    }
    this._status = 'failed';
    this._completedAt = new Date();
    this._error = error;
  }

  /**
   * Create unique job ID
   */
  static generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
