/**
 * RegressionRegistryPort — Type-only Port for CC regression tracking.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.2
 * Plan SC: MON-CC lifecycle automation (Addendum §6).
 *
 * @module lib/domain/ports/regression-registry.port
 *
 * @version 2.1.12
 */

/**
 * @typedef {Object} Guard
 * @property {string} id - "MON-CC-02" | "ENH-262" | etc.
 * @property {string} issue - GitHub issue URL
 * @property {'HIGH'|'MEDIUM'|'LOW'} severity
 * @property {string} since - bkit version where guard was introduced (e.g. "2.1.10")
 * @property {string|null} expectedFix - CC version where fix expected, or null
 * @property {string[]} affectedFiles - File paths touched
 * @property {string|null} resolvedAt - ISO timestamp when resolved, or null
 */

/**
 * @typedef {Object} RegressionRegistryPort
 * @property {() => Promise<Guard[]>} listActive - Enumerate active guards
 * @property {(id: string) => Promise<boolean>} isResolved - Check if guard resolved
 * @property {(id: string, reason: string) => Promise<void>} deactivate - Mark guard inactive
 */

module.exports = {};
