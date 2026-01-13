import { SyncState } from '../core/types';
import { ILogger } from '../core/logger/ILogger';
import { SyncEventBus } from './events/SyncEventBus';
import { Profile } from '../domain/entities/Profile';

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<SyncState, SyncState[]> = {
  idle: ['initializing'],
  initializing: ['connecting', 'error', 'idle'],
  connecting: ['watching', 'error', 'idle'],
  watching: ['syncing', 'error', 'idle'],
  syncing: ['watching', 'error'],
  error: ['recovering', 'idle'],
  recovering: ['watching', 'error', 'idle']
};

/**
 * State machine for sync operations
 */
export class SyncStateMachine {
  private _state: SyncState = 'idle';
  private _profile?: Profile;
  private _lastError?: string;
  private _retryCount = 0;

  readonly maxRetries: number;

  constructor(
    private readonly eventBus: SyncEventBus,
    private readonly logger: ILogger,
    options: { maxRetries?: number } = {}
  ) {
    this.maxRetries = options.maxRetries ?? 3;
  }

  get state(): SyncState {
    return this._state;
  }

  get profile(): Profile | undefined {
    return this._profile;
  }

  get lastError(): string | undefined {
    return this._lastError;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get isActive(): boolean {
    return this._state !== 'idle' && this._state !== 'error';
  }

  get canRetry(): boolean {
    return this._retryCount < this.maxRetries;
  }

  /**
   * Transition to a new state
   */
  transition(newState: SyncState, context?: { profile?: Profile; error?: string }): boolean {
    if (!this.canTransitionTo(newState)) {
      this.logger.warn(
        'StateMachine',
        `Invalid transition: ${this._state} -> ${newState}`
      );
      return false;
    }

    const oldState = this._state;
    this._state = newState;

    // Update context
    if (context?.profile) {
      this._profile = context.profile;
    }

    if (context?.error) {
      this._lastError = context.error;
    }

    // Reset retry count on successful states
    if (newState === 'watching') {
      this._retryCount = 0;
    }

    // Increment retry count when recovering
    if (newState === 'recovering') {
      this._retryCount++;
    }

    // Clear profile on idle
    if (newState === 'idle') {
      this._profile = undefined;
      this._lastError = undefined;
      this._retryCount = 0;
    }

    this.logger.info('StateMachine', `State: ${oldState} -> ${newState}`);
    this.eventBus.emitStateChanged(oldState, newState, this._profile);

    return true;
  }

  /**
   * Check if transition to target state is valid
   */
  canTransitionTo(targetState: SyncState): boolean {
    return VALID_TRANSITIONS[this._state]?.includes(targetState) ?? false;
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    const oldState = this._state;
    this._state = 'idle';
    this._profile = undefined;
    this._lastError = undefined;
    this._retryCount = 0;

    if (oldState !== 'idle') {
      this.eventBus.emitStateChanged(oldState, 'idle');
    }
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(): SyncState[] {
    return [...(VALID_TRANSITIONS[this._state] ?? [])];
  }
}
