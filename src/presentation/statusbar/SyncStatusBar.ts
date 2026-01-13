import * as vscode from 'vscode';
import { SyncState } from '../../core/types';
import { SyncOrchestrator } from '../../application/SyncOrchestrator';

interface StatusConfig {
  text: string;
  icon: string;
  tooltip: string;
  color?: vscode.ThemeColor;
}

const STATUS_CONFIGS: Record<SyncState, StatusConfig> = {
  idle: {
    text: 'Watch Sync',
    icon: '$(sync)',
    tooltip: 'Click to start Watch Sync',
    color: undefined
  },
  initializing: {
    text: 'Initializing...',
    icon: '$(loading~spin)',
    tooltip: 'Initializing Watch Sync',
    color: undefined
  },
  connecting: {
    text: 'Connecting...',
    icon: '$(loading~spin)',
    tooltip: 'Connecting to remote host',
    color: undefined
  },
  watching: {
    text: 'Watching',
    icon: '$(eye)',
    tooltip: 'Watching for file changes',
    color: new vscode.ThemeColor('statusBarItem.prominentBackground')
  },
  syncing: {
    text: 'Syncing...',
    icon: '$(sync~spin)',
    tooltip: 'Syncing files to remote',
    color: undefined
  },
  error: {
    text: 'Error',
    icon: '$(error)',
    tooltip: 'Sync error occurred',
    color: new vscode.ThemeColor('statusBarItem.errorBackground')
  },
  recovering: {
    text: 'Recovering...',
    icon: '$(loading~spin)',
    tooltip: 'Attempting to recover from error',
    color: new vscode.ThemeColor('statusBarItem.warningBackground')
  }
};

/**
 * Status bar component for sync status
 */
export class SyncStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly subscriptions: vscode.Disposable[] = [];

  constructor(private readonly orchestrator: SyncOrchestrator) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.command = 'watchSync.start';
    this.updateStatus('idle');
    this.statusBarItem.show();

    // Subscribe to state changes
    this.subscriptions.push(
      orchestrator.onStateChanged(({ newState, profile }) => {
        this.updateStatus(newState, profile?.alias);
      })
    );

    this.subscriptions.push(
      orchestrator.onSyncCompleted(({ result }) => {
        if (result.success && result.filesTransferred > 0) {
          this.showTemporaryMessage(`Synced ${result.filesTransferred} file(s)`);
        }
      })
    );
  }

  private updateStatus(state: SyncState, profileAlias?: string): void {
    const config = STATUS_CONFIGS[state];

    let text = `${config.icon} ${config.text}`;
    if (profileAlias && state !== 'idle') {
      text = `${config.icon} ${profileAlias}: ${config.text}`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = config.tooltip;
    this.statusBarItem.backgroundColor = config.color as vscode.ThemeColor | undefined;

    // Change command based on state
    this.statusBarItem.command = state === 'idle' ? 'watchSync.start' : 'watchSync.stop';
  }

  private showTemporaryMessage(message: string): void {
    const originalText = this.statusBarItem.text;

    this.statusBarItem.text = `$(check) ${message}`;

    setTimeout(() => {
      if (this.orchestrator.isActive) {
        this.updateStatus(this.orchestrator.state, this.orchestrator.profile?.alias);
      } else {
        this.statusBarItem.text = originalText;
      }
    }, 2000);
  }

  dispose(): void {
    this.subscriptions.forEach(s => s.dispose());
    this.statusBarItem.dispose();
  }
}
