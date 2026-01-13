import * as vscode from 'vscode';
import { FileChangeEvent, WatchConfig } from '../../core/types';

/**
 * File watcher interface for dependency injection
 */
export interface IFileWatcher {
  /**
   * Event fired when files change
   */
  readonly onDidChange: vscode.Event<FileChangeEvent[]>;

  /**
   * Start watching the specified path
   */
  start(config: WatchConfig): Promise<void>;

  /**
   * Stop watching
   */
  stop(): Promise<void>;

  /**
   * Check if watcher is currently running
   */
  isRunning(): boolean;

  /**
   * Dispose resources
   */
  dispose(): void;
}
