import * as assert from 'assert';
import { Profile } from '../../domain/entities/Profile';

suite('Profile Entity Test Suite', () => {

  test('creates profile with required fields', () => {
    const profile = new Profile({
      alias: 'test',
      remoteUser: 'user',
      remoteHost: 'host.com',
      remoteDir: '/remote',
      localDir: '/local'
    });

    assert.strictEqual(profile.alias, 'test');
    assert.strictEqual(profile.remoteUser, 'user');
    assert.strictEqual(profile.remoteHost, 'host.com');
    assert.strictEqual(profile.remoteDir, '/remote');
    assert.strictEqual(profile.localDir, '/local');
  });

  test('applies default values', () => {
    const profile = new Profile({
      alias: 'test',
      remoteUser: 'user',
      remoteHost: 'host.com',
      remoteDir: '/remote',
      localDir: '/local'
    });

    assert.strictEqual(profile.sshPort, 22);
    assert.strictEqual(profile.direction, 'localToRemote');
    assert.strictEqual(profile.conflictPolicy, 'localWins');
    assert.deepStrictEqual([...profile.exclude], []);
  });

  test('accepts custom optional values', () => {
    const profile = new Profile({
      alias: 'test',
      remoteUser: 'user',
      remoteHost: 'host.com',
      remoteDir: '/remote',
      localDir: '/local',
      sshPort: 2222,
      exclude: ['.git', 'node_modules']
    });

    assert.strictEqual(profile.sshPort, 2222);
    assert.deepStrictEqual([...profile.exclude], ['.git', 'node_modules']);
  });

  test('exclude array is frozen (immutable)', () => {
    const profile = new Profile({
      alias: 'test',
      remoteUser: 'user',
      remoteHost: 'host.com',
      remoteDir: '/remote',
      localDir: '/local',
      exclude: ['.git']
    });

    assert.ok(Object.isFrozen(profile.exclude), 'exclude array should be frozen');
  });

  test('with() creates new profile with updates', () => {
    const original = new Profile({
      alias: 'original',
      remoteUser: 'user',
      remoteHost: 'host.com',
      remoteDir: '/remote',
      localDir: '/local'
    });

    const updated = original.with({ alias: 'updated', sshPort: 3333 });

    assert.strictEqual(updated.alias, 'updated');
    assert.strictEqual(updated.sshPort, 3333);
    assert.strictEqual(updated.remoteHost, 'host.com'); // unchanged
    assert.notStrictEqual(original, updated); // different instance
    assert.strictEqual(original.alias, 'original'); // original unchanged
  });

  test('toSSHConfig returns SSH configuration', () => {
    const profile = new Profile({
      alias: 'test',
      remoteUser: 'deploy',
      remoteHost: 'server.com',
      remoteDir: '/remote',
      localDir: '/local',
      sshPort: 2222
    });

    const sshConfig = profile.toSSHConfig();

    assert.deepStrictEqual(sshConfig, {
      host: 'server.com',
      user: 'deploy',
      port: 2222
    });
  });

  test('toPlainObject returns serializable object', () => {
    const profile = new Profile({
      alias: 'test',
      remoteUser: 'user',
      remoteHost: 'host.com',
      remoteDir: '/remote',
      localDir: '/local',
      sshPort: 22,
      exclude: ['.git']
    });

    const plain = profile.toPlainObject();

    assert.strictEqual(plain.alias, 'test');
    assert.strictEqual(plain.remoteUser, 'user');
    assert.strictEqual(plain.remoteHost, 'host.com');
    assert.strictEqual(plain.remoteDir, '/remote');
    assert.strictEqual(plain.localDir, '/local');
    assert.strictEqual(plain.sshPort, 22);
    assert.strictEqual(plain.direction, 'localToRemote');
    assert.strictEqual(plain.conflictPolicy, 'localWins');
    assert.deepStrictEqual(plain.exclude, ['.git']);
  });
});
