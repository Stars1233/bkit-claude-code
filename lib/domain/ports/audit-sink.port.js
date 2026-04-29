/**
 * AuditSinkPort — Type-only Port for audit event emission (dual sink: file + OTEL).
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.3.2
 * Plan SC: ENH-259 OTEL dual sink (조건부 P2).
 *
 * @module lib/domain/ports/audit-sink.port
 *
 * @version 2.1.12
 */

/**
 * @typedef {Object} AuditEvent
 * @property {string} type - Event type (e.g. "guard.deactivated", "cc-regression-detected")
 * @property {string} [id] - Guard ID or entity ID
 * @property {string} [ver] - Related CC version
 * @property {Object} [meta] - Additional structured metadata (redacted per C2 sanitizer)
 */

/**
 * @typedef {Object} AuditSinkPort
 * @property {(event: AuditEvent) => Promise<void>} emit
 */

module.exports = {};
