import { FileChangeType } from '../../core/types';

/**
 * File event entity - represents a file system change event
 */
export class FileEvent {
  readonly type: FileChangeType;
  readonly path: string;
  readonly timestamp: Date;
  readonly oldPath?: string;

  constructor(params: {
    type: FileChangeType;
    path: string;
    timestamp?: Date;
    oldPath?: string;
  }) {
    this.type = params.type;
    this.path = params.path;
    this.timestamp = params.timestamp ?? new Date();
    this.oldPath = params.oldPath;
  }

  /**
   * Check if this is a move event
   */
  isMove(): boolean {
    return this.type === 'move' && this.oldPath !== undefined;
  }

  /**
   * Check if this is a creation event
   */
  isCreate(): boolean {
    return this.type === 'create';
  }

  /**
   * Check if this is a modification event
   */
  isModify(): boolean {
    return this.type === 'modify';
  }

  /**
   * Check if this is a deletion event
   */
  isDelete(): boolean {
    return this.type === 'delete';
  }

  /**
   * Get affected paths (for move events, includes both old and new)
   */
  getAffectedPaths(): string[] {
    if (this.isMove() && this.oldPath) {
      return [this.path, this.oldPath];
    }
    return [this.path];
  }

  /**
   * Convert to plain object
   */
  toPlainObject() {
    return {
      type: this.type,
      path: this.path,
      timestamp: this.timestamp.toISOString(),
      oldPath: this.oldPath
    };
  }

  /**
   * Create from raw inotify event data
   */
  static fromInotifyEvent(eventType: string, path: string): FileEvent | null {
    const type = this.mapInotifyType(eventType);
    if (!type) return null;

    return new FileEvent({ type, path });
  }

  private static mapInotifyType(eventType: string): FileChangeType | null {
    const lower = eventType.toLowerCase();

    if (lower.includes('close_write') || lower.includes('modify')) {
      return 'modify';
    }
    if (lower.includes('create')) {
      return 'create';
    }
    if (lower.includes('delete')) {
      return 'delete';
    }
    if (lower.includes('move')) {
      return 'move';
    }

    return null;
  }
}
