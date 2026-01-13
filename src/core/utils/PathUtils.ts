import * as path from 'path';
import * as fs from 'fs';

/**
 * Path manipulation utilities
 */
export class PathUtils {
  /**
   * Normalize a path and resolve it to absolute
   */
  static normalizePath(inputPath: string): string {
    return path.normalize(path.resolve(inputPath));
  }

  /**
   * Ensure path ends with a trailing slash
   */
  static ensureTrailingSlash(inputPath: string): string {
    return inputPath.endsWith(path.sep) ? inputPath : inputPath + path.sep;
  }

  /**
   * Remove trailing slash from path
   */
  static removeTrailingSlash(inputPath: string): string {
    return inputPath.endsWith(path.sep) ? inputPath.slice(0, -1) : inputPath;
  }

  /**
   * Check if childPath is a subpath of parentPath
   */
  static isSubPath(parentPath: string, childPath: string): boolean {
    const normalizedParent = this.ensureTrailingSlash(this.normalizePath(parentPath));
    const normalizedChild = this.normalizePath(childPath);
    return normalizedChild.startsWith(normalizedParent);
  }

  /**
   * Get relative path from base to target
   */
  static getRelativePath(basePath: string, targetPath: string): string {
    return path.relative(basePath, targetPath);
  }

  /**
   * Check if path exists
   */
  static async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.promises.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if path is a directory
   */
  static async isDirectory(targetPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(targetPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if path is readable
   */
  static async isReadable(targetPath: string): Promise<boolean> {
    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if path is writable
   */
  static async isWritable(targetPath: string): Promise<boolean> {
    try {
      await fs.promises.access(targetPath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve workspace folder variable in path
   */
  static resolveWorkspaceFolder(inputPath: string, workspaceFolder?: string): string {
    if (!workspaceFolder) {
      return inputPath;
    }
    return inputPath.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
  }

  /**
   * Join paths safely
   */
  static join(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Get directory name from path
   */
  static dirname(inputPath: string): string {
    return path.dirname(inputPath);
  }

  /**
   * Get base name from path
   */
  static basename(inputPath: string): string {
    return path.basename(inputPath);
  }
}
