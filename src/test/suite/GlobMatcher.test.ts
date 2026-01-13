import * as assert from 'assert';
import { GlobMatcher } from '../../infrastructure/watcher/GlobMatcher';

suite('GlobMatcher Test Suite', () => {

  test('excludes exact directory name', () => {
    const matcher = new GlobMatcher(['.git', 'node_modules']);

    assert.ok(matcher.isExcluded('.git'), '.git should be excluded');
    assert.ok(matcher.isExcluded('node_modules'), 'node_modules should be excluded');
    assert.ok(!matcher.isExcluded('src'), 'src should not be excluded');
  });

  test('excludes nested directory paths', () => {
    const matcher = new GlobMatcher(['node_modules']);

    assert.ok(
      matcher.isExcluded('project/node_modules/package'),
      'Nested node_modules should be excluded'
    );
    assert.ok(
      matcher.isExcluded('/home/user/project/node_modules'),
      'Deep nested path should be excluded'
    );
  });

  test('excludes files inside excluded directories', () => {
    const matcher = new GlobMatcher(['.git']);

    assert.ok(
      matcher.isExcluded('.git/config'),
      'Files inside .git should be excluded'
    );
    assert.ok(
      matcher.isExcluded('.git/objects/pack'),
      'Deep nested .git paths should be excluded'
    );
  });

  test('handles wildcard patterns', () => {
    const matcher = new GlobMatcher(['*.log', '*.tmp']);

    assert.ok(matcher.isExcluded('error.log'), '*.log should match error.log');
    assert.ok(matcher.isExcluded('cache.tmp'), '*.tmp should match cache.tmp');
    assert.ok(!matcher.isExcluded('script.ts'), '*.log should not match .ts files');
  });

  test('handles double wildcard patterns', () => {
    const matcher = new GlobMatcher(['**/test/**']);

    assert.ok(
      matcher.isExcluded('src/test/unit'),
      '**/ should match any path depth'
    );
  });

  test('handles question mark wildcard', () => {
    const matcher = new GlobMatcher(['file?.txt']);

    assert.ok(matcher.isExcluded('file1.txt'), '? should match single char');
    assert.ok(matcher.isExcluded('fileA.txt'), '? should match any single char');
    assert.ok(!matcher.isExcluded('file12.txt'), '? should not match multiple chars');
  });

  test('normalizes Windows paths', () => {
    const matcher = new GlobMatcher(['node_modules']);

    assert.ok(
      matcher.isExcluded('src\\node_modules\\package'),
      'Should normalize backslashes'
    );
  });

  test('getPatterns returns original patterns', () => {
    const patterns = ['.git', 'node_modules', '*.log'];
    const matcher = new GlobMatcher(patterns);

    const result = matcher.getPatterns();
    assert.deepStrictEqual(result, patterns);
    assert.notStrictEqual(result, patterns); // Should be a copy
  });

  test('empty patterns excludes nothing', () => {
    const matcher = new GlobMatcher([]);

    assert.ok(!matcher.isExcluded('.git'));
    assert.ok(!matcher.isExcluded('node_modules'));
    assert.ok(!matcher.isExcluded('any/path'));
  });

  test('case insensitive matching', () => {
    const matcher = new GlobMatcher(['README.md']);

    assert.ok(matcher.isExcluded('readme.md'), 'Should match lowercase');
    assert.ok(matcher.isExcluded('README.MD'), 'Should match uppercase');
  });
});
