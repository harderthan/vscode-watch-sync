/**
 * Interface for credential management
 */
export interface ICredentialManager {
  /**
   * Get password for a host. Returns null if not stored.
   */
  getPassword(host: string, user: string): Promise<string | null>;

  /**
   * Store password for a host
   */
  setPassword(host: string, user: string, password: string): Promise<void>;

  /**
   * Delete stored password for a host
   */
  deletePassword(host: string, user: string): Promise<void>;

  /**
   * Check if password exists for a host
   */
  hasPassword(host: string, user: string): Promise<boolean>;

  /**
   * Prompt user for password and optionally store it
   */
  promptForPassword(host: string, user: string): Promise<string | null>;
}
