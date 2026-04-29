/**
 * StateStorePort — Type-only Port for persistent state IO.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §2.3
 * Plan SC: Domain state access without FS coupling.
 *
 * @module lib/domain/ports/state-store.port
 *
 * @version 2.1.12
 */

/**
 * @typedef {Object} StateStorePort
 * @property {(key: string) => Promise<any>} load - Load arbitrary JSON-serializable state
 * @property {(key: string, val: any) => Promise<void>} save - Persist state (atomic write preferred)
 * @property {(key: string) => Promise<void>} lock - Acquire lock for fingerprint dedup (ENH-239)
 * @property {(key: string) => Promise<void>} unlock - Release lock
 */

module.exports = {};
