/**
 * Log levels for the logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger interface for dependency injection
 */
export interface ILogger {
  /**
   * Current log level
   */
  readonly level: LogLevel;

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void;

  /**
   * Log a debug message
   */
  debug(component: string, message: string, ...args: unknown[]): void;

  /**
   * Log an info message
   */
  info(component: string, message: string, ...args: unknown[]): void;

  /**
   * Log a warning message
   */
  warn(component: string, message: string, ...args: unknown[]): void;

  /**
   * Log an error message
   */
  error(component: string, message: string, error?: Error): void;

  /**
   * Show the output channel in VS Code
   */
  show(): void;

  /**
   * Dispose of the logger resources
   */
  dispose(): void;
}
