/**
 * Base class for all sync-related errors
 */
export abstract class SyncErrorBase extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      cause: this.cause?.message,
      stack: this.stack
    };
  }
}
