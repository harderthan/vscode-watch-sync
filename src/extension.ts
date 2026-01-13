import * as vscode from 'vscode';

// Core
import { Logger } from './core/logger/Logger';
import { ProcessUtils } from './core/utils/ProcessUtils';

// Infrastructure
import { VSCodeConfigProvider } from './infrastructure/config/VSCodeConfigProvider';
import { InotifyWatcher } from './infrastructure/watcher/InotifyWatcher';
import { SSH2Client } from './infrastructure/ssh/SSH2Client';
import { RsyncClient } from './infrastructure/sync/RsyncClient';
import { RsyncCommandBuilder } from './infrastructure/sync/RsyncCommandBuilder';
import { CredentialManager } from './infrastructure/credentials/CredentialManager';

// Domain
import { SyncService } from './domain/services/SyncService';

// Application
import { SyncOrchestrator } from './application/SyncOrchestrator';

// Presentation
import { StartWatchCommand, StopWatchCommand, registerCommands } from './presentation/commands';
import { SyncStatusBar } from './presentation/statusbar/SyncStatusBar';
import { ProfileWizard } from './presentation/wizard/ProfileWizard';

let orchestrator: SyncOrchestrator | undefined;
let statusBar: SyncStatusBar | undefined;
let ssh2Client: SSH2Client | undefined;

/**
 * Check and warn about missing dependencies
 */
async function checkDependencies(logger: Logger): Promise<void> {
  const missing: string[] = [];

  if (!await ProcessUtils.commandExists('rsync')) {
    missing.push('rsync');
  }
  if (!await ProcessUtils.commandExists('inotifywait')) {
    missing.push('inotify-tools');
  }

  if (missing.length > 0) {
    const installCmd = 'sudo apt install rsync inotify-tools';
    const action = await vscode.window.showWarningMessage(
      `Watch Sync: Missing required packages: ${missing.join(', ')}`,
      'Copy Install Command'
    );

    if (action === 'Copy Install Command') {
      await vscode.env.clipboard.writeText(installCmd);
      vscode.window.showInformationMessage('Install command copied to clipboard.');
    }

    logger.warn('Extension', `Missing dependencies: ${missing.join(', ')}`);
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = Logger.getInstance();
  logger.info('Extension', 'Activating Watch Sync');

  try {
    // Check dependencies (non-blocking)
    checkDependencies(logger);

    // Initialize infrastructure
    const configProvider = new VSCodeConfigProvider(logger);
    const watcher = new InotifyWatcher(logger);

    // Use SSH2Client instead of system ssh/sshpass
    ssh2Client = new SSH2Client(logger);
    const rsyncCommandBuilder = new RsyncCommandBuilder();
    const rsyncClient = new RsyncClient(logger, rsyncCommandBuilder);

    // Initialize credential manager using VSCode SecretStorage
    const credentialManager = new CredentialManager(context.secrets, logger);

    // Password callback to set password on SSH2Client and update rsync env
    const setPasswordCallback = (password: string | null) => {
      ssh2Client!.setPassword(password);
      // Update rsync client's environment with SSH_ASKPASS settings
      rsyncClient.setEnv(ssh2Client!.getEnvForSubprocess());
    };

    // Initialize domain services
    const syncService = new SyncService(rsyncClient, logger);

    // Initialize orchestrator (now uses SSH2Client)
    orchestrator = new SyncOrchestrator(watcher, syncService, ssh2Client, logger);

    // Initialize presentation
    const wizard = new ProfileWizard(configProvider, logger);
    const startCommand = new StartWatchCommand(
      orchestrator,
      configProvider,
      wizard,
      logger,
      credentialManager,
      setPasswordCallback
    );
    const stopCommand = new StopWatchCommand(orchestrator, logger);

    // Register commands
    registerCommands(context, startCommand, stopCommand);

    // Initialize status bar
    statusBar = new SyncStatusBar(orchestrator);
    context.subscriptions.push({ dispose: () => statusBar?.dispose() });

    // Cleanup SSH2Client on deactivation
    context.subscriptions.push({ dispose: () => ssh2Client?.dispose() });

    // Auto-start if configured
    const autoStartProfile = configProvider.getAutoStartProfile();
    if (autoStartProfile) {
      logger.info('Extension', `Auto-starting profile: ${autoStartProfile}`);
      try {
        await startCommand.executeWithProfile(autoStartProfile);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Extension', `Auto-start failed: ${message}`);
      }
    }

    logger.info('Extension', 'Watch Sync activated');

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Extension', `Activation failed: ${message}`);
    vscode.window.showErrorMessage(`Watch Sync activation failed: ${message}`);
  }
}

export function deactivate(): void {
  const logger = Logger.getInstance();
  logger.info('Extension', 'Deactivating Watch Sync');

  orchestrator?.dispose();
  statusBar?.dispose();
  ssh2Client?.dispose();
  logger.dispose();
}
