import * as vscode from 'vscode';
import { ILogger } from '../core/logger/ILogger';
import { FileChangeEvent, WatchConfig } from '../core/types';
import { ProcessUtils } from '../core/utils/ProcessUtils';
import { Profile } from '../domain/entities/Profile';
import { SyncService } from '../domain/services/SyncService';
import { ProfileValidator } from '../domain/validators/ProfileValidator';
import { IFileWatcher } from '../infrastructure/watcher/IFileWatcher';
import { ISSHClient } from '../infrastructure/ssh/ISSHClient';
import { SyncStateMachine } from './SyncStateMachine';
import { SyncEventBus } from './events/SyncEventBus';

const RECOVERY_DELAY_MS = 5000;

/**
 * Main orchestrator for sync operations
 */
export class SyncOrchestrator {
  private readonly stateMachine: SyncStateMachine;
  private readonly eventBus: SyncEventBus;
  private readonly validator: ProfileValidator;
  private watcherSubscription?: vscode.Disposable;
  private recoveryTimeout?: NodeJS.Timeout;

  constructor(
    private readonly watcher: IFileWatcher,
    private readonly syncService: SyncService,
    private readonly sshClient: ISSHClient,
    private readonly logger: ILogger
  ) {
    this.eventBus = new SyncEventBus();
    this.stateMachine = new SyncStateMachine(this.eventBus, logger);
    this.validator = new ProfileValidator();
  }

  // Event accessors
  get onStateChanged() { return this.eventBus.onStateChanged; }
  get onSyncStarted() { return this.eventBus.onSyncStarted; }
  get onSyncCompleted() { return this.eventBus.onSyncCompleted; }
  get onSyncFailed() { return this.eventBus.onSyncFailed; }
  get onError() { return this.eventBus.onError; }

  get state() { return this.stateMachine.state; }
  get profile() { return this.stateMachine.profile; }
  get isActive() { return this.stateMachine.isActive; }

  /**
   * Start watching and syncing with a profile
   */
  async start(profile: Profile, workspaceFolder?: string): Promise<void> {
    // Reset state machine if active or in error state
    if (this.stateMachine.isActive || this.stateMachine.state === 'error') {
      await this.stop();
    }

    this.logger.info('Orchestrator', `Starting with profile: ${profile.alias}`);

    // Initialize
    this.stateMachine.transition('initializing', { profile });

    try {
      // Validate profile
      const validation = await this.validator.validate(profile, {
        workspaceFolder,
        checkLocalDirectory: true
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      // Check prerequisites
      await this.checkPrerequisites();

      // Test SSH connection
      this.stateMachine.transition('connecting');
      const sshConfig = profile.toSSHConfig();
      const connectionResult = await this.sshClient.testConnection(sshConfig);

      if (!connectionResult.success) {
        throw new Error(`SSH connection failed: ${connectionResult.error}`);
      }

      // Perform initial full sync
      const fullSyncJob = this.syncService.createFullSyncJob(profile);
      this.eventBus.emitSyncStarted(fullSyncJob);
      const syncResult = await this.syncService.sync(fullSyncJob);

      if (!syncResult.success) {
        throw new Error(`Initial sync failed: ${syncResult.errors.join('; ')}`);
      }

      this.eventBus.emitSyncCompleted(fullSyncJob, syncResult);

      // Start file watcher
      this.stateMachine.transition('watching');
      await this.startWatcher(profile);

      this.logger.info('Orchestrator', 'Watch sync started successfully');

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Orchestrator', `Start failed: ${message}`);
      this.stateMachine.transition('error', { error: message });
      this.eventBus.emitError(message, true);
      throw error;
    }
  }

  /**
   * Stop watching and syncing
   */
  async stop(): Promise<void> {
    this.logger.info('Orchestrator', 'Stopping');

    this.clearRecoveryTimeout();

    if (this.watcherSubscription) {
      this.watcherSubscription.dispose();
      this.watcherSubscription = undefined;
    }

    await this.watcher.stop();
    this.stateMachine.reset();

    this.logger.info('Orchestrator', 'Stopped');
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stop();
    this.eventBus.dispose();
    this.watcher.dispose();
  }

  private async checkPrerequisites(): Promise<void> {
    const rsyncAvailable = await ProcessUtils.commandExists('rsync');
    if (!rsyncAvailable) {
      throw new Error('rsync is not installed');
    }

    const inotifyAvailable = await ProcessUtils.commandExists('inotifywait');
    if (!inotifyAvailable) {
      throw new Error('inotifywait is not installed (install inotify-tools)');
    }
  }

  private async startWatcher(profile: Profile): Promise<void> {
    const watchConfig: WatchConfig = {
      targetPath: profile.localDir,
      excludePatterns: [...profile.exclude],
      debounceMs: 200
    };

    await this.watcher.start(watchConfig);

    this.watcherSubscription = this.watcher.onDidChange(events => {
      this.handleFileChanges(events);
    });
  }

  private async handleFileChanges(events: FileChangeEvent[]): Promise<void> {
    if (this.stateMachine.state !== 'watching') {
      return;
    }

    const files = events.map(e => e.path);
    this.eventBus.emitFilesChanged(files);

    this.stateMachine.transition('syncing');

    try {
      const profile = this.stateMachine.profile;
      if (!profile) {
        throw new Error('No active profile');
      }

      const job = this.syncService.createIncrementalSyncJob(profile, files);
      this.eventBus.emitSyncStarted(job);

      const result = await this.syncService.sync(job);

      if (result.success) {
        this.eventBus.emitSyncCompleted(job, result);
        this.stateMachine.transition('watching');
      } else {
        this.eventBus.emitSyncFailed(job, result.errors.join('; '));
        throw new Error(result.errors.join('; '));
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Orchestrator', `Sync failed: ${message}`);
      this.stateMachine.transition('error', { error: message });

      if (this.stateMachine.canRetry) {
        this.scheduleRecovery();
      } else {
        this.eventBus.emitError(`Sync failed after ${this.stateMachine.retryCount} retries: ${message}`, false);
      }
    }
  }

  private scheduleRecovery(): void {
    this.clearRecoveryTimeout();

    this.logger.info('Orchestrator', `Scheduling recovery (attempt ${this.stateMachine.retryCount + 1})`);
    this.stateMachine.transition('recovering');

    this.recoveryTimeout = setTimeout(async () => {
      try {
        const profile = this.stateMachine.profile;
        if (profile) {
          this.stateMachine.transition('watching');
          this.logger.info('Orchestrator', 'Recovery successful');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('Orchestrator', `Recovery failed: ${message}`);
        this.stateMachine.transition('error', { error: message });

        if (this.stateMachine.canRetry) {
          this.scheduleRecovery();
        }
      }
    }, RECOVERY_DELAY_MS);
  }

  private clearRecoveryTimeout(): void {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
      this.recoveryTimeout = undefined;
    }
  }
}
