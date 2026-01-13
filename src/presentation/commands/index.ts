import * as vscode from 'vscode';
import { StartWatchCommand } from './StartWatchCommand';
import { StopWatchCommand } from './StopWatchCommand';

export { StartWatchCommand } from './StartWatchCommand';
export { StopWatchCommand } from './StopWatchCommand';

/**
 * Register all commands
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  startCommand: StartWatchCommand,
  stopCommand: StopWatchCommand
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('watchSync.start', () => startCommand.execute()),
    vscode.commands.registerCommand('watchSync.stop', () => stopCommand.execute())
  );
}
