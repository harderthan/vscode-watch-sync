import * as vscode from 'vscode';
import { ILogger, LogLevel } from './ILogger';

/**
 * VSCode OutputChannel-based logger implementation
 * Singleton pattern for global access
 */
export class Logger implements ILogger {
  private static instance: Logger | null = null;
  private outputChannel: vscode.OutputChannel;
  private _level: LogLevel = LogLevel.INFO;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Watch Sync');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (Logger.instance) {
      Logger.instance.dispose();
      Logger.instance = null;
    }
  }

  get level(): LogLevel {
    return this._level;
  }

  setLevel(level: LogLevel): void {
    this._level = level;
  }

  debug(component: string, message: string, ...args: unknown[]): void {
    if (this._level <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, component, message, args);
    }
  }

  info(component: string, message: string, ...args: unknown[]): void {
    if (this._level <= LogLevel.INFO) {
      this.log(LogLevel.INFO, component, message, args);
    }
  }

  warn(component: string, message: string, ...args: unknown[]): void {
    if (this._level <= LogLevel.WARN) {
      this.log(LogLevel.WARN, component, message, args);
    }
  }

  error(component: string, message: string, error?: Error): void {
    if (this._level <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, component, message);
      if (error) {
        this.outputChannel.appendLine(`  Error: ${error.message}`);
        if (error.stack) {
          this.outputChannel.appendLine(`  Stack: ${error.stack}`);
        }
      }
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }

  private log(level: LogLevel, component: string, message: string, args?: unknown[]): void {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level].padEnd(5);
    const componentName = component.padEnd(15);

    let formattedMessage = `[${timestamp}] [${levelName}] [${componentName}] ${message}`;

    if (args && args.length > 0) {
      formattedMessage += ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
    }

    this.outputChannel.appendLine(formattedMessage);
  }
}

/**
 * Default logger instance export for convenience
 */
export const logger = Logger.getInstance();
