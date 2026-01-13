/**
 * Glob pattern matcher for file exclusion
 * Uses simple pattern matching compatible with rsync exclude patterns
 */
export class GlobMatcher {
  private readonly patterns: RegExp[];
  private readonly rawPatterns: string[];

  constructor(patterns: string[]) {
    this.rawPatterns = patterns;
    this.patterns = patterns.map(p => this.patternToRegex(p));
  }

  /**
   * Check if a path should be excluded
   */
  isExcluded(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/');

    for (let i = 0; i < this.patterns.length; i++) {
      if (this.patterns[i].test(normalizedPath)) {
        return true;
      }

      // Also check if path is inside an excluded directory
      const pattern = this.rawPatterns[i];
      if (this.isInsideExcludedDirectory(normalizedPath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the raw patterns
   */
  getPatterns(): string[] {
    return [...this.rawPatterns];
  }

  /**
   * Convert glob pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const regex = pattern
      .replace(/\\/g, '/')
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except * and ?
      .replace(/\*\*/g, '{{GLOBSTAR}}')     // Temporarily replace **
      .replace(/\*/g, '[^/]*')              // * matches anything except /
      .replace(/\?/g, '[^/]')               // ? matches single char except /
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');  // ** matches anything including /

    // Match at any path level
    return new RegExp(`(^|/)${regex}($|/)`, 'i');
  }

  /**
   * Check if path is inside an excluded directory
   */
  private isInsideExcludedDirectory(path: string, pattern: string): boolean {
    // Simple directory patterns like ".git", "node_modules"
    if (!pattern.includes('/') && !pattern.includes('*')) {
      const segments = path.split('/');
      return segments.some(segment => segment === pattern);
    }

    return false;
  }
}
