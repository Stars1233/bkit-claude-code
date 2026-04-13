/**
 * Wiring Scanner — detect exported-but-never-called functions across codebase
 * @module lib/qa/scanners/wiring
 * @version 2.1.5
 *
 * Unlike dead-code scanner (Phase 2) which checks if modules are imported,
 * this scanner checks if individual exported functions/constants are actually
 * referenced anywhere in the codebase. Catches the "Built But Not Wired" pattern
 * where functions are exported but never consumed by any caller.
 */

const path = require('path');
const fs = require('fs');
const ScannerBase = require('../scanner-base');
const { getJsFiles } = require('../utils/file-resolver');
const { extractExports } = require('../utils/pattern-matcher');

/** Modules where unwired exports indicate broken user-facing features */
const CRITICAL_MODULES = [
  'automation',
  'gate-manager',
  'state-machine',
  'skill-orchestrator',
  'metrics-collector',
  'batch-orchestrator'
];

/** Common utility names that are legitimately exported for external/future use */
const IGNORE_NAMES = new Set([
  'default', 'module', 'exports', 'constructor',
  'toString', 'valueOf', 'toJSON'
]);

class WiringScanner extends ScannerBase {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    super('wiring', {
      ...options,
      include: options.include || ['lib/**/*.js'],
      exclude: options.exclude || ['node_modules', 'tests', '*.test.js']
    });
  }

  /**
   * Run wiring analysis
   * @returns {Promise<import('../scanner-base').Issue[]>}
   */
  async scan() {
    this.reset();

    this.log('Phase 1: Collecting all exports from lib/ modules...');
    const allExports = this._collectExports();

    this.log(`Phase 1 complete: ${allExports.length} exports found`);

    this.log('Phase 2: Checking references across codebase...');
    this._checkReferences(allExports);

    this.log(`Phase 2 complete: ${this.issues.length} unwired exports found`);

    return this.issues;
  }

  /**
   * Collect all exports from lib/ JavaScript files
   * @returns {Array<{name: string, file: string, relFile: string, line: number}>}
   * @private
   */
  _collectExports() {
    const libFiles = getJsFiles(this.include, this.exclude, this.rootDir);
    const allExports = [];

    for (const filePath of libFiles) {
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const exports = extractExports(content);
      const relFile = path.relative(this.rootDir, filePath);

      for (const exp of exports) {
        if (IGNORE_NAMES.has(exp.name)) continue;
        allExports.push({
          name: exp.name,
          file: filePath,
          relFile,
          line: exp.line
        });
      }
    }

    return allExports;
  }

  /**
   * Check if each export is referenced elsewhere in the codebase
   * @param {Array<{name: string, file: string, relFile: string, line: number}>} allExports
   * @private
   */
  _checkReferences(allExports) {
    // Collect all file contents from search directories
    const searchPatterns = [
      'lib/**/*.js',
      'scripts/**/*.js',
      'servers/**/*.js',
      'hooks/**/*.js'
    ];
    const searchFiles = getJsFiles(searchPatterns, this.exclude, this.rootDir);

    // Pre-load all file contents for fast search
    const fileContents = new Map();
    for (const filePath of searchFiles) {
      try {
        fileContents.set(filePath, fs.readFileSync(filePath, 'utf-8'));
      } catch {
        continue;
      }
    }

    // Also load SKILL.md and agent .md files for reference checking
    const mdContents = this._loadMdContents();

    for (const exp of allExports) {
      let found = false;

      // Search JS files
      for (const [otherFile, content] of fileContents) {
        if (otherFile === exp.file) continue;
        if (content.includes(exp.name)) {
          found = true;
          break;
        }
      }

      // If not found in JS, check markdown files (skills/agents reference lib/ functions)
      if (!found) {
        for (const content of mdContents) {
          if (content.includes(exp.name)) {
            found = true;
            break;
          }
        }
      }

      if (!found) {
        const severity = this._getSeverity(exp.file);
        this.addIssue(
          severity,
          exp.relFile,
          exp.line,
          `exported but never called: ${exp.name}`,
          'unwired-export',
          'Remove unused export or add a consumer in the appropriate module'
        );
      }
    }
  }

  /**
   * Load markdown contents from skills/ and agents/ directories
   * @returns {string[]}
   * @private
   */
  _loadMdContents() {
    const contents = [];
    const dirs = [
      path.join(this.rootDir, 'skills'),
      path.join(this.rootDir, 'agents')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = this._findMdFiles(dir);
        for (const file of files) {
          try {
            contents.push(fs.readFileSync(file, 'utf-8'));
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    return contents;
  }

  /**
   * Recursively find .md files in a directory
   * @param {string} dir
   * @returns {string[]}
   * @private
   */
  _findMdFiles(dir) {
    const results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          results.push(...this._findMdFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
    return results;
  }

  /**
   * Determine severity based on module criticality
   * @param {string} filePath - Absolute file path
   * @returns {'WARNING'|'INFO'}
   * @private
   */
  _getSeverity(filePath) {
    const isCritical = CRITICAL_MODULES.some(m => filePath.includes(`/${m}`));
    return isCritical ? 'WARNING' : 'INFO';
  }
}

module.exports = WiringScanner;
