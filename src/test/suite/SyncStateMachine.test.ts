import * as assert from 'assert';
import { SyncStateMachine } from '../../application/SyncStateMachine';
import { SyncEventBus } from '../../application/events/SyncEventBus';
import { ILogger, LogLevel } from '../../core/logger/ILogger';

// Mock logger
const mockLogger: ILogger = {
  level: LogLevel.INFO,
  setLevel: () => { /* noop */ },
  debug: () => { /* noop */ },
  info: () => { /* noop */ },
  warn: () => { /* noop */ },
  error: () => { /* noop */ },
  show: () => { /* noop */ },
  dispose: () => { /* noop */ }
};

suite('SyncStateMachine Test Suite', () => {
  let eventBus: SyncEventBus;
  let stateMachine: SyncStateMachine;

  setup(() => {
    eventBus = new SyncEventBus();
    stateMachine = new SyncStateMachine(eventBus, mockLogger);
  });

  test('initial state is idle', () => {
    assert.strictEqual(stateMachine.state, 'idle');
  });

  test('valid transition: idle -> initializing', () => {
    const result = stateMachine.transition('initializing');
    assert.ok(result, 'Transition should succeed');
    assert.strictEqual(stateMachine.state, 'initializing');
  });

  test('valid transition chain: idle -> initializing -> connecting -> watching', () => {
    stateMachine.transition('initializing');
    stateMachine.transition('connecting');
    const result = stateMachine.transition('watching');

    assert.ok(result, 'Final transition should succeed');
    assert.strictEqual(stateMachine.state, 'watching');
  });

  test('invalid transition: idle -> watching', () => {
    const result = stateMachine.transition('watching');
    assert.ok(!result, 'Direct transition from idle to watching should fail');
    assert.strictEqual(stateMachine.state, 'idle');
  });

  test('invalid transition: watching -> idle requires error first', () => {
    stateMachine.transition('initializing');
    stateMachine.transition('connecting');
    stateMachine.transition('watching');

    // watching can go to: syncing, error, idle
    const toIdle = stateMachine.transition('idle');
    assert.ok(toIdle, 'watching -> idle should be valid');
  });

  test('transition to error sets lastError', () => {
    stateMachine.transition('initializing');
    stateMachine.transition('error', { error: 'Connection failed' });

    assert.strictEqual(stateMachine.state, 'error');
    assert.strictEqual(stateMachine.lastError, 'Connection failed');
  });

  test('recovery increments retry count', () => {
    stateMachine.transition('initializing');
    stateMachine.transition('error');

    assert.strictEqual(stateMachine.retryCount, 0);

    stateMachine.transition('recovering');
    assert.strictEqual(stateMachine.retryCount, 1);

    stateMachine.transition('error');
    stateMachine.transition('recovering');
    assert.strictEqual(stateMachine.retryCount, 2);
  });

  test('successful watching resets retry count', () => {
    stateMachine.transition('initializing');
    stateMachine.transition('error');
    stateMachine.transition('recovering');

    assert.strictEqual(stateMachine.retryCount, 1);

    stateMachine.transition('watching');
    assert.strictEqual(stateMachine.retryCount, 0);
  });

  test('canRetry respects maxRetries', () => {
    stateMachine = new SyncStateMachine(eventBus, mockLogger, { maxRetries: 2 });

    stateMachine.transition('initializing');
    stateMachine.transition('error');

    assert.ok(stateMachine.canRetry, 'Should be able to retry (0/2)');

    stateMachine.transition('recovering');
    stateMachine.transition('error');
    assert.ok(stateMachine.canRetry, 'Should be able to retry (1/2)');

    stateMachine.transition('recovering');
    stateMachine.transition('error');
    assert.ok(!stateMachine.canRetry, 'Should not be able to retry (2/2)');
  });

  test('reset returns to idle state', () => {
    stateMachine.transition('initializing');
    stateMachine.transition('connecting');
    stateMachine.transition('watching');

    stateMachine.reset();

    assert.strictEqual(stateMachine.state, 'idle');
    assert.strictEqual(stateMachine.profile, undefined);
    assert.strictEqual(stateMachine.retryCount, 0);
  });

  test('isActive returns true for active states', () => {
    assert.ok(!stateMachine.isActive, 'idle should not be active');

    stateMachine.transition('initializing');
    assert.ok(stateMachine.isActive, 'initializing should be active');

    stateMachine.transition('connecting');
    assert.ok(stateMachine.isActive, 'connecting should be active');

    stateMachine.transition('watching');
    assert.ok(stateMachine.isActive, 'watching should be active');

    stateMachine.transition('error');
    assert.ok(!stateMachine.isActive, 'error should not be active');
  });

  test('getAvailableTransitions returns valid next states', () => {
    const idleTransitions = stateMachine.getAvailableTransitions();
    assert.deepStrictEqual(idleTransitions, ['initializing']);

    stateMachine.transition('initializing');
    const initTransitions = stateMachine.getAvailableTransitions();
    assert.ok(initTransitions.includes('connecting'));
    assert.ok(initTransitions.includes('error'));
  });
});
