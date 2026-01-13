import { SyncDirection, ConflictPolicy } from '../../core/types';

/**
 * Profile entity - immutable representation of a sync profile
 */
export class Profile {
  readonly alias: string;
  readonly remoteUser: string;
  readonly remoteHost: string;
  readonly remoteDir: string;
  readonly localDir: string;
  readonly sshPort: number;
  readonly direction: SyncDirection;
  readonly conflictPolicy: ConflictPolicy;
  readonly exclude: readonly string[];

  constructor(params: {
    alias: string;
    remoteUser: string;
    remoteHost: string;
    remoteDir: string;
    localDir: string;
    sshPort?: number;
    direction?: SyncDirection;
    conflictPolicy?: ConflictPolicy;
    exclude?: string[];
  }) {
    this.alias = params.alias;
    this.remoteUser = params.remoteUser;
    this.remoteHost = params.remoteHost;
    this.remoteDir = params.remoteDir;
    this.localDir = params.localDir;
    this.sshPort = params.sshPort ?? 22;
    this.direction = params.direction ?? 'localToRemote';
    this.conflictPolicy = params.conflictPolicy ?? 'localWins';
    this.exclude = Object.freeze([...(params.exclude ?? [])]);
  }

  /**
   * Create a copy with updated properties
   */
  with(updates: Partial<Omit<Profile, 'with' | 'toSSHConfig' | 'toPlainObject'>>): Profile {
    return new Profile({
      alias: updates.alias ?? this.alias,
      remoteUser: updates.remoteUser ?? this.remoteUser,
      remoteHost: updates.remoteHost ?? this.remoteHost,
      remoteDir: updates.remoteDir ?? this.remoteDir,
      localDir: updates.localDir ?? this.localDir,
      sshPort: updates.sshPort ?? this.sshPort,
      direction: updates.direction ?? this.direction,
      conflictPolicy: updates.conflictPolicy ?? this.conflictPolicy,
      exclude: updates.exclude ? [...updates.exclude] : [...this.exclude]
    });
  }

  /**
   * Get SSH configuration
   */
  toSSHConfig() {
    return {
      host: this.remoteHost,
      user: this.remoteUser,
      port: this.sshPort
    };
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject() {
    return {
      alias: this.alias,
      remoteUser: this.remoteUser,
      remoteHost: this.remoteHost,
      remoteDir: this.remoteDir,
      localDir: this.localDir,
      sshPort: this.sshPort,
      direction: this.direction,
      conflictPolicy: this.conflictPolicy,
      exclude: [...this.exclude]
    };
  }
}
