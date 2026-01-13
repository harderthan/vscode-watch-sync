import { IRsyncCommandBuilder } from './IRsyncClient';
import { ProfileConfig } from '../config/IConfigurationProvider';
import { SpawnArgs } from '../../core/types';
import { PathUtils } from '../../core/utils/PathUtils';

/**
 * Builds rsync commands safely using spawn arguments (no shell injection)
 */
export class RsyncCommandBuilder implements IRsyncCommandBuilder {
  buildFullSync(profile: ProfileConfig): SpawnArgs {
    const args = this.buildBaseArgs(profile);

    args.push('--delete'); // Remove files on destination not on source

    // Add source and destination
    const source = PathUtils.ensureTrailingSlash(profile.localDir);
    const dest = this.buildRemoteDestination(profile);

    args.push(source);
    args.push(dest);

    return { command: 'rsync', args };
  }

  buildIncrementalSync(profile: ProfileConfig, files: string[]): SpawnArgs {
    if (files.length === 0) {
      return this.buildFullSync(profile);
    }

    const args = this.buildBaseArgs(profile);

    // Use relative paths for files-from
    args.push('--files-from=-'); // Read file list from stdin

    const source = PathUtils.ensureTrailingSlash(profile.localDir);
    const dest = this.buildRemoteDestination(profile);

    args.push(source);
    args.push(dest);

    return {
      command: 'rsync',
      args,
      cwd: profile.localDir
    };
  }

  buildDryRun(profile: ProfileConfig): SpawnArgs {
    const args = this.buildBaseArgs(profile);

    args.push('--dry-run');
    args.push('--delete');
    args.push('-v'); // Verbose to see what would change

    const source = PathUtils.ensureTrailingSlash(profile.localDir);
    const dest = this.buildRemoteDestination(profile);

    args.push(source);
    args.push(dest);

    return { command: 'rsync', args };
  }

  private buildBaseArgs(profile: ProfileConfig): string[] {
    const args: string[] = [
      '-a',   // Archive mode (preserves permissions, timestamps, etc.)
      '-z',   // Compress during transfer
    ];

    // SSH command with port
    // StrictHostKeyChecking=accept-new auto-accepts new hosts
    args.push('-e', `ssh -p ${profile.sshPort} -o StrictHostKeyChecking=accept-new`);

    // Add exclude patterns
    for (const pattern of profile.exclude) {
      args.push('--exclude', pattern);
    }

    return args;
  }

  private buildRemoteDestination(profile: ProfileConfig): string {
    const remoteDir = PathUtils.ensureTrailingSlash(profile.remoteDir);
    return `${profile.remoteUser}@${profile.remoteHost}:${remoteDir}`;
  }
}
