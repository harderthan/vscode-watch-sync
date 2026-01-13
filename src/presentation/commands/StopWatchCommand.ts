import * as vscode from 'vscode';
import { SyncOrchestrator } from '../../application/SyncOrchestrator';
import { ILogger } from '../../core/logger/ILogger';

/**
 * Command to stop watching and syncing
 */
export class StopWatchCommand {
  constructor(
    private readonly orchestrator: SyncOrchestrator,
    private readonly logger: ILogger
  ) {}

  /**
   * Execute the stop command
   */
  async execute(): Promise<void> {
    try {
      if (!this.orchestrator.isActive) {
        vscode.window.showInformationMessage('Watch Sync is not running');
        return;
      }

      const profileAlias = this.orchestrator.profile?.alias;

      await this.orchestrator.stop();

      vscode.window.showInformationMessage(
        profileAlias
          ? `Watch Sync stopped: ${profileAlias}`
          : 'Watch Sync stopped'
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('StopCommand', message);
      vscode.window.showErrorMessage(`Failed to stop Watch Sync: ${message}`);
    }
  }
}
