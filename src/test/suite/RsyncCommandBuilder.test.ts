import * as assert from 'assert';
import { RsyncCommandBuilder } from '../../infrastructure/sync/RsyncCommandBuilder';
import { ProfileConfig } from '../../infrastructure/config/IConfigurationProvider';

suite('RsyncCommandBuilder Test Suite', () => {
  let builder: RsyncCommandBuilder;

  setup(() => {
    builder = new RsyncCommandBuilder();
  });

  function createProfile(overrides: Partial<ProfileConfig> = {}): ProfileConfig {
    return {
      alias: 'test-profile',
      remoteUser: 'testuser',
      remoteHost: 'example.com',
      remoteDir: '/remote/path',
      localDir: '/local/path',
      sshPort: 22,
      direction: 'localToRemote',
      conflictPolicy: 'localWins',
      exclude: [],
      ...overrides
    };
  }

  test('buildFullSync returns rsync command', () => {
    const profile = createProfile();
    const result = builder.buildFullSync(profile);

    assert.strictEqual(result.command, 'rsync');
    assert.ok(Array.isArray(result.args));
  });

  test('buildFullSync includes archive and compress flags', () => {
    const profile = createProfile();
    const result = builder.buildFullSync(profile);

    assert.ok(result.args.includes('-a'), 'Should include -a (archive) flag');
    assert.ok(result.args.includes('-z'), 'Should include -z (compress) flag');
  });

  test('buildFullSync includes --delete flag', () => {
    const profile = createProfile();
    const result = builder.buildFullSync(profile);

    assert.ok(result.args.includes('--delete'), 'Should include --delete flag');
  });

  test('buildFullSync includes SSH with port', () => {
    const profile = createProfile({ sshPort: 2222 });
    const result = builder.buildFullSync(profile);

    const sshArgIndex = result.args.indexOf('-e');
    assert.ok(sshArgIndex !== -1, 'Should have -e flag');
    assert.ok(
      result.args[sshArgIndex + 1].includes('-p 2222'),
      'SSH command should include port 2222'
    );
  });

  test('buildFullSync includes exclude patterns', () => {
    const profile = createProfile({ exclude: ['.git', 'node_modules', '*.log'] });
    const result = builder.buildFullSync(profile);

    const excludeArgs = result.args.filter((arg, i) =>
      result.args[i - 1] === '--exclude'
    );

    assert.ok(excludeArgs.includes('.git'), 'Should exclude .git');
    assert.ok(excludeArgs.includes('node_modules'), 'Should exclude node_modules');
    assert.ok(excludeArgs.includes('*.log'), 'Should exclude *.log');
  });

  test('buildFullSync includes source with trailing slash', () => {
    const profile = createProfile({ localDir: '/local/path' });
    const result = builder.buildFullSync(profile);

    assert.ok(
      result.args.some(arg => arg === '/local/path/'),
      'Source path should have trailing slash'
    );
  });

  test('buildFullSync includes remote destination', () => {
    const profile = createProfile({
      remoteUser: 'deploy',
      remoteHost: 'prod.example.com',
      remoteDir: '/var/www/app'
    });
    const result = builder.buildFullSync(profile);

    assert.ok(
      result.args.some(arg => arg === 'deploy@prod.example.com:/var/www/app/'),
      'Should include formatted remote destination'
    );
  });

  test('buildIncrementalSync uses files-from stdin', () => {
    const profile = createProfile();
    const files = ['/local/path/file1.ts', '/local/path/file2.ts'];
    const result = builder.buildIncrementalSync(profile, files);

    assert.ok(
      result.args.includes('--files-from=-'),
      'Should use files-from stdin'
    );
  });

  test('buildIncrementalSync falls back to full sync for empty files', () => {
    const profile = createProfile();
    const result = builder.buildIncrementalSync(profile, []);

    assert.ok(
      result.args.includes('--delete'),
      'Empty files should fall back to full sync with --delete'
    );
  });

  test('buildDryRun includes dry-run and verbose flags', () => {
    const profile = createProfile();
    const result = builder.buildDryRun(profile);

    assert.ok(result.args.includes('--dry-run'), 'Should include --dry-run');
    assert.ok(result.args.includes('-v'), 'Should include -v (verbose)');
  });
});
