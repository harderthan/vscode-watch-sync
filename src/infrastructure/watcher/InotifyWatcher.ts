import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { IFileWatcher } from './IFileWatcher';
import { GlobMatcher } from './GlobMatcher';
import { FileChangeEvent, WatchConfig, FileChangeType } from '../../core/types';
import { ILogger } from '../../core/logger/ILogger';
import { ProcessUtils } from '../../core/utils/ProcessUtils';

const DEFAULT_DEBOUNCE_MS = 200;
const PROCESS_KILL_TIMEOUT_MS = 5000;

/**
 * File watcher implementation using inotifywait
 */
export class InotifyWatcher implements IFileWatcher {
  private process: ChildProcess | null = null;
  private globMatcher: GlobMatcher | null = null;
  private pendingEvents: Map<string, FileChangeEvent> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs: number = DEFAULT_DEBOUNCE_MS;

  private readonly _onDidChange = new vscode.EventEmitter<FileChangeEvent[]>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly logger: ILogger) {}

  async start(config: WatchConfig): Promise<void> {
    if (this.process) {
      await this.stop();
    }

    this.debounceMs = config.debounceMs || DEFAULT_DEBOUNCE_MS;
    this.globMatcher = new GlobMatcher(config.excludePatterns);

    const args = [
      '-m',           // Monitor mode
      '-r',           // Recursive
      '-e', 'close_write',
      '-e', 'create',
      '-e', 'delete',
      '-e', 'move',
      '--format', '%e %w%f',
      config.targetPath
    ];

    this.logger.info('Watcher', `Starting inotifywait on ${config.targetPath}`);
    this.logger.debug('Watcher', `Exclude patterns: ${config.excludePatterns.join(', ')}`);

    this.process = spawn('inotifywait', args);

    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        this.handleEvent(line);
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message && !message.includes('Watches established')) {
        this.logger.warn('Watcher', `inotifywait stderr: ${message}`);
      }
    });

    this.process.on('close', (code) => {
      if (code !== null && code !== 0) {
        this.logger.error('Watcher', `inotifywait exited with code ${code}`);
      }
      this.process = null;
    });

    this.process.on('error', (error) => {
      this.logger.error('Watcher', `inotifywait error: ${error.message}`);
      this.process = null;
    });
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Flush any pending events
    this.flushEvents();

    if (this.process) {
      this.logger.info('Watcher', 'Stopping inotifywait');
      await ProcessUtils.killProcess(this.process, PROCESS_KILL_TIMEOUT_MS);
      this.process = null;
    }

    this.pendingEvents.clear();
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  dispose(): void {
    this.stop();
    this._onDidChange.dispose();
  }

  private handleEvent(line: string): void {
    const match = line.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      return;
    }

    const [, eventType, filePath] = match;

    // Check exclusions
    if (this.globMatcher?.isExcluded(filePath)) {
      this.logger.debug('Watcher', `Excluded: ${filePath}`);
      return;
    }

    const changeType = this.mapEventType(eventType);
    if (!changeType) {
      return;
    }

    const event: FileChangeEvent = {
      type: changeType,
      path: filePath,
      timestamp: new Date()
    };

    this.queueEvent(event);
  }

  private mapEventType(inotifyEvent: string): FileChangeType | null {
    const eventLower = inotifyEvent.toLowerCase();

    if (eventLower.includes('close_write') || eventLower.includes('modify')) {
      return 'modify';
    }
    if (eventLower.includes('create')) {
      return 'create';
    }
    if (eventLower.includes('delete')) {
      return 'delete';
    }
    if (eventLower.includes('move')) {
      return 'move';
    }

    return null;
  }

  private queueEvent(event: FileChangeEvent): void {
    // Use path as key to deduplicate rapid events on same file
    this.pendingEvents.set(event.path, event);

    // Reset debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushEvents();
    }, this.debounceMs);
  }

  private flushEvents(): void {
    if (this.pendingEvents.size === 0) {
      return;
    }

    const events = Array.from(this.pendingEvents.values());
    this.pendingEvents.clear();

    this.logger.debug('Watcher', `Flushing ${events.length} events`);
    this._onDidChange.fire(events);
  }
}
