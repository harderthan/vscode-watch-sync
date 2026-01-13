import * as vscode from 'vscode';
import { SyncState, SyncResult } from '../../core/types';
import { SyncJob } from '../../domain/entities/SyncJob';
import { Profile } from '../../domain/entities/Profile';

/**
 * Event types for sync operations
 */
export interface SyncEvents {
  stateChanged: { oldState: SyncState; newState: SyncState; profile?: Profile };
  syncStarted: { job: SyncJob };
  syncCompleted: { job: SyncJob; result: SyncResult };
  syncFailed: { job: SyncJob; error: string };
  filesChanged: { files: string[] };
  error: { message: string; recoverable: boolean };
}

/**
 * Event bus for sync-related events
 */
export class SyncEventBus {
  private readonly _onStateChanged = new vscode.EventEmitter<SyncEvents['stateChanged']>();
  private readonly _onSyncStarted = new vscode.EventEmitter<SyncEvents['syncStarted']>();
  private readonly _onSyncCompleted = new vscode.EventEmitter<SyncEvents['syncCompleted']>();
  private readonly _onSyncFailed = new vscode.EventEmitter<SyncEvents['syncFailed']>();
  private readonly _onFilesChanged = new vscode.EventEmitter<SyncEvents['filesChanged']>();
  private readonly _onError = new vscode.EventEmitter<SyncEvents['error']>();

  // Public event accessors
  readonly onStateChanged = this._onStateChanged.event;
  readonly onSyncStarted = this._onSyncStarted.event;
  readonly onSyncCompleted = this._onSyncCompleted.event;
  readonly onSyncFailed = this._onSyncFailed.event;
  readonly onFilesChanged = this._onFilesChanged.event;
  readonly onError = this._onError.event;

  // Event emitters
  emitStateChanged(oldState: SyncState, newState: SyncState, profile?: Profile): void {
    this._onStateChanged.fire({ oldState, newState, profile });
  }

  emitSyncStarted(job: SyncJob): void {
    this._onSyncStarted.fire({ job });
  }

  emitSyncCompleted(job: SyncJob, result: SyncResult): void {
    this._onSyncCompleted.fire({ job, result });
  }

  emitSyncFailed(job: SyncJob, error: string): void {
    this._onSyncFailed.fire({ job, error });
  }

  emitFilesChanged(files: string[]): void {
    this._onFilesChanged.fire({ files });
  }

  emitError(message: string, recoverable = true): void {
    this._onError.fire({ message, recoverable });
  }

  dispose(): void {
    this._onStateChanged.dispose();
    this._onSyncStarted.dispose();
    this._onSyncCompleted.dispose();
    this._onSyncFailed.dispose();
    this._onFilesChanged.dispose();
    this._onError.dispose();
  }
}
